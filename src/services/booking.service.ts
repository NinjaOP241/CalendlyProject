import { Slot } from "../../generated/prisma/client.js";
import { BookingStatus, SlotStatus } from "../../generated/prisma/enums.js";
import {
  CreateBookingDTO,
  ListHostBookingsQueryDTO,
} from "../dtos/booking.dto.js";
import {
  createBooking,
  cancelBooking as cancelBookingRepo,
  findBookingById,
  findHostBookings,
} from "../repositories/booking.repository.js";
import { getById as getUserByIdRepo } from "../repositories/user.repository.js";
import { runInTransaction } from "../repositories/db-client.js";
import {
  findSlotById,
  lockAndFetchSlot,
  markSlotAvailable,
  markSlotBooked,
  markSlotBookedIfAvailable,
} from "../repositories/slot.repository.js";
import {
  startCreateGoogleCalendarEventWorkflow,
  startRegenerateHostSlotsWorkflow,
  startSendBookingCancellationEmailWorkflow,
  startSendBookingConfirmationEmailWorkflow,
} from "../temporal/client.js";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from "../utils/api-error.js";
import { DateTime } from "luxon";

/**
 * @param hostId - The ID of the host for whom the slot regeneration is triggered
 * @param slotStartAt - The start time of the slot that was booked
 *
 * Example of date formatting:
 * If slotStartAt is "2024-06-15T14:30:00Z", the date extracted will be "2024-06-15".
 * This date is then used to trigger the slot regeneration workflow for that specific day.
 */
async function triggerSlotRegeneration(hostId: number, slotStartAt: Date) {
  const date = slotStartAt.toISOString().split("T")[0];
  await startRegenerateHostSlotsWorkflow({
    hostId,
    from: date,
    to: date,
  });

  console.log(
    `[booking] Triggering slot regeneration for host ${hostId} on ${date}`,
  );
}

/**
 * Validates the slot
 *
 * @param slot - The retrieved slot entity or null if not found
 * @param hostId - The ID of the host the booking is intended for
 * @returns The validated slot entity
 * @throws NotFoundError if the slot does not exist
 * @throws ForbiddenError if the slot belongs to a different host
 * @throws ConflictError if the slot is no longer available
 * @throws BadRequestError if the slot start time has already passed
 */
function validateSlotForBooking(slot: Slot | null, hostId: number): Slot {
  if (!slot) {
    throw notFound("Slot not found");
  }

  if (slot.hostId !== hostId) {
    throw forbidden("You are not authorized to create a booking for this slot");
  }

  if (slot.status !== SlotStatus.AVAILABLE) {
    throw conflict("Slot is not available");
  }

  if (slot.startAt <= new Date()) {
    throw badRequest("Slot has already started");
  }

  return slot;
}

/**
 * RESPONSE MATCHER / DTO MAPPER
 * Transforms raw database models into a structured, secure API response contract.
 * Decouples internal database schemas from external API contracts.
 *
 * @param booking - Raw booking object returned from the database layer
 * @returns Formatted JSON response object containing selected fields and ISO dates
 */
function formatBookingResponse(booking: {
  id: number;
  status: BookingStatus;
  slot: {
    startAt: Date;
    endAt: Date;
  };
}) {
  return {
    booking: {
      id: booking.id,
      status: booking.status,
      startAt: booking.slot.startAt.toISOString(),
      endAt: booking.slot.endAt.toISOString(),
    },
  };
}

async function postBookingActions(booking: {
  id: number;
  hostId: number;
  status: BookingStatus;
  slot: { startAt: Date; endAt: Date };
}) {
  await triggerSlotRegeneration(booking.hostId, booking.slot.startAt);
  await startSendBookingConfirmationEmailWorkflow(booking.id);
  await startCreateGoogleCalendarEventWorkflow(booking.id);

  return formatBookingResponse(booking);
}

/**
 * OPTIMISTIC CONCURRENCY CONTROL (OCC) WORKFLOW
 *
 * Business Flow:
 * 1. Opens an atomic transaction boundary via Unit of Work pattern.
 * 2. Fetches and validates the slot.
 * 3. Atomically attempts to update the slot status from AVAILABLE to BOOKED
 *    using an atomic `updateMany` operation (prevents race conditions at the hardware level).
 *    Race condition is prevented, since while updating both the id and status field is used to
 *    select the row. And since the operation is atomic only one of them will pass and change the status field.
 *    Remaining requests wont be able to select the slot since status is changed.
 * 4. If the updated.count === 0, the slot got booked by someone else
 *
 * @param userId - ID of the host receiving the booking
 * @param bookingData - Payload containing slot ID and invitee details
 * @returns Formatted booking response contract
 */
export async function createBookingOptimistically(
  userId: number,
  bookingData: CreateBookingDTO,
) {
  // The entire bookng must be created in a single transaction
  const booking = await runInTransaction(async (tx) => {
    // Step 1: Find the slot using transaction-scoped client and validate the slot
    const slot = validateSlotForBooking(
      await findSlotById(bookingData.slotId, tx),
      userId,
    );

    // Step 2: Optimisitically try to book the slot
    const updated = await markSlotBookedIfAvailable(bookingData.slotId, tx);

    // Step 3: If the slot was not updated, it means it was already booked by another user
    if (updated.count === 0) {
      throw conflict("Slot is no longer available");
    }

    // Step 4: Create final booking record
    return createBooking(
      {
        slotId: bookingData.slotId,
        inviteeName: bookingData.inviteeName,
        inviteeEmail: bookingData.inviteeEmail,
        inviteeNotes: bookingData.inviteeNotes,
        hostId: userId,
        eventTypeId: slot.eventTypeId,
      },
      tx,
    );
  });

  return postBookingActions(booking);
}

/**
 * PESSIMISTIC CONCURRENCY CONTROL (PCC) WORKFLOW
 *
 * Business Flow:
 * 1. Opens an atomic transaction boundary via Unit of Work pattern.
 * 2. Immediately locks the specific slot row in the database using `FOR UPDATE`.
 * 3. Validate the slot
 * 4. Updates the slot status to BOOKED.
 *
 * @param userId - ID of the host receiving the booking
 * @param bookingData - Payload containing slot ID and invitee details
 * @returns Formatted booking response contract
 */
export async function createBookingPessimistically(
  userId: number,
  bookingData: CreateBookingDTO,
) {
  // The entire bookng must be created in a single transaction
  const booking = await runInTransaction(async (tx) => {
    // Step 1: Lock row and fetch slot simultaneously
    const slot = validateSlotForBooking(
      await lockAndFetchSlot(bookingData.slotId, tx),
      userId,
    );

    // Step 2: Update slot state to booked
    await markSlotBooked(bookingData.slotId, tx);

    // Step 3: Create final booking record
    return createBooking(
      {
        slotId: bookingData.slotId,
        inviteeEmail: bookingData.inviteeEmail,
        inviteeName: bookingData.inviteeName,
        inviteeNotes: bookingData.inviteeNotes,
        hostId: userId,
        eventTypeId: slot.eventTypeId,
      },
      tx,
    );
  });

  return postBookingActions(booking);
}

function formatBookingListItem(booking: {
  id: number;
  status: string;
  inviteeEmail: string;
  inviteeName: string;
  inviteeNotes: string | null;
  slot: { startAt: Date; endAt: Date };
  eventType: { id: number; title: string; slug: string };
}) {
  return {
    id: booking.id,
    status: booking.status,
    inviteeEmail: booking.inviteeEmail,
    inviteeName: booking.inviteeName,
    inviteeNotes: booking.inviteeNotes,
    startAt: booking.slot.startAt.toISOString(),
    endAt: booking.slot.endAt.toISOString(),
    eventType: booking.eventType,
  };
}

export async function listHostBookings(
  hostId: number,
  query: ListHostBookingsQueryDTO,
) {
  const host = await getUserByIdRepo(hostId);

  if (!host) {
    throw notFound("User not found");
  }

  const timezone = host.timezone;

  const from = query.from
    ? DateTime.fromISO(query.from, { zone: timezone }).startOf("day").toJSDate()
    : undefined;

  const to = query.to
    ? DateTime.fromISO(query.to, { zone: timezone }).endOf("day").toJSDate()
    : undefined;

  const bookings = await findHostBookings(hostId, {
    status: query.status,
    from,
    to,
  });

  return {
    bookings: bookings.map(formatBookingListItem),
  };
}

export async function cancelBooking(hostId: number, bookingId: number) {
  const cancelledBooking = await runInTransaction(async (tx) => {
    const booking = await findBookingById(bookingId);

    if (!booking) {
      throw notFound("Booking not found");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw badRequest("Booking is already cancelled");
    }

    if (booking.hostId !== hostId) {
      throw forbidden("You are not authorized to cancel this booking");
    }

    const updatedBooking = await cancelBookingRepo(bookingId);

    await markSlotAvailable(booking.slot.id, tx);

    return updatedBooking;
  });

  await startSendBookingCancellationEmailWorkflow(bookingId);

  return {
    id: cancelledBooking.id,
    status: cancelledBooking.status,
    canceledAt: cancelledBooking.canceledAt,
  };
}
