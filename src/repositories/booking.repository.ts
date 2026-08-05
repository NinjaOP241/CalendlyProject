import { BookingStatus } from "../../generated/prisma/enums.js";
import { DbClient, getDbClient } from "./db-client.js";

export interface CreateBookingData {
  slotId: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeNotes?: string;
  hostId: number;
  eventTypeId: number;
}

export async function createBooking(data: CreateBookingData, db?: DbClient) {
  const client = getDbClient(db);

  return client.booking.create({
    data: {
      ...data,
      status: BookingStatus.CONFIRMED,
    },
    include: {
      slot: true,
    },
  });
}
