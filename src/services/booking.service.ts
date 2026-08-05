import { Slot } from "../../generated/prisma/client.js";
import { BookingStatus, SlotStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../config/database.js";
import { CreateBookingDTO } from "../dtos/booking.dto.js";
import { badRequest, notFound } from "../utils/api-error.js";

export async function createBookingOptimistically(
  userId: number,
  bookingData: CreateBookingDTO,
) {
  // The entire bookng must be created in a single transaction
  const booking = await prisma.$transaction(async (tx) => {
    /**
     * In a transaction, whenever we have to query the database,
     * we must use the transaction client (tx) instead of the global prisma client.
     */

    // Check if the slot is available
    const slot = await tx.slot.findUnique({
      where: { id: bookingData.slotId },
    });

    // If the slot does not exist
    if (!slot) {
      throw notFound("Slot not found");
    }

    // If the slot is not available
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw badRequest("Slot is not available");
    }

    // Prevent booking of past slots
    if (slot.startAt <= new Date()) {
      throw badRequest("Slot has already started");
    }

    // Optimistically update the slot status to BOOKED
    /**
     * We are not locking any rows in the database,
     * and allowing multiple users to attempt to book the same slot at the same time,
     * but only one of them will succeed in updating the slot status to BOOKED.
     *
     * The updateMany is a atomic operation. So even if two users A and B tries to book the
     * same slot at the same time, at hardware level each atomic operation will be executed one after
     * the other, and only one of them will succeed in updating the slot status from AVAILABLE to BOOKED.
     *
     * The updateMany method returns the number of rows that were updated.
     * If the count is 0, it means that the slot was already booked by another user,
     * and we throw an error.
     */
    const updated = await tx.slot.updateMany({
      where: {
        id: bookingData.slotId,
        status: SlotStatus.AVAILABLE,
      },
      data: { status: SlotStatus.BOOKED },
    });

    // If the slot was not updated, it means it was already booked by another user
    if (updated.count === 0) {
      throw badRequest("Slot is not available");
    }

    return tx.booking.create({
      data: {
        slotId: bookingData.slotId,
        inviteeName: bookingData.inviteeName,
        inviteeEmail: bookingData.inviteeEmail,
        inviteeNotes: bookingData.inviteeNotes,
        status: BookingStatus.CONFIRMED,
        hostId: userId,
        eventTypeId: slot.eventTypeId,
      },
      include: {
        slot: true,
      },
    });
  });

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      startAt: booking.slot.startAt.toISOString(),
      endAt: booking.slot.endAt.toISOString(),
    },
  };
}

export async function createBookingPessimistically(
  userId: number,
  bookingData: CreateBookingDTO,
) {
  const booking = await prisma.$transaction(async (tx) => {
    const slots = await tx.$queryRaw<Slot[]>`
        SELECT *
        FROM slots 
        WHERE id = ${bookingData.slotId}
        FOR UPDATE
    `;

    const slot = slots[0];

    if (!slot) {
      throw notFound("Slot not found");
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw badRequest("Slot is not available");
    }

    if (slot.startAt <= new Date()) {
      throw badRequest("Slot has already started");
    }

    await tx.slot.update({
      where: { id: bookingData.slotId },
      data: {
        status: SlotStatus.BOOKED,
      },
    });

    return tx.booking.create({
      data: {
        slotId: bookingData.slotId,
        inviteeEmail: bookingData.inviteeEmail,
        inviteeName: bookingData.inviteeName,
        inviteeNotes: bookingData.inviteeNotes,
        status: BookingStatus.CONFIRMED,
        hostId: userId,
        eventTypeId: slot.eventTypeId,
      },
      include: {
        slot: true,
      },
    });
  });

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      startAt: booking.slot.startAt.toISOString(),
      endAt: booking.slot.endAt.toISOString(),
    },
  };
}
