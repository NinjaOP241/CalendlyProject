import { Slot } from "../../generated/prisma/client.js";
import { BookingStatus, SlotStatus } from "../../generated/prisma/enums.js";
import { CreateBookingDTO } from "../dtos/booking.dto.js";
import { createBooking } from "../repositories/booking.repository.js";
import { runInTransaction } from "../repositories/db-client.js";
import {
  findSlotById,
  lockAndFetchSlot,
  markSlotBooked,
  markSlotBookedIfAvailable,
} from "../repositories/slot.repository.js";
import { badRequest, conflict, notFound } from "../utils/api-error.js";

/**
 * Validates the slot
 *
 * @param slot - The retrieved slot entity or null if not found
 * @returns The validated slot entity
 * @throws NotFoundError if the slot does not exist
 * @throws ConflictError if the slot is no longer available
 * @throws BadRequestError if the slot start time has already passed
 */
function validateSlotForBooking(slot: Slot | null): Slot {
  if (!slot) {
    throw notFound("Slot not found");
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

  return formatBookingResponse(booking);
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

  return formatBookingResponse(booking);
}
