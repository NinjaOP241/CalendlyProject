import { BookingStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../config/database.js";
import { DbClient, getDbClient } from "./db-client.js";

export interface CreateBookingData {
  slotId: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeNotes?: string;
  hostId: number;
  eventTypeId: number;
}

export interface ListHostBookingFilters {
  status?: BookingStatus;
  from?: Date;
  to?: Date;
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

export async function findHostBookings(
  hostId: number,
  filters: ListHostBookingFilters,
) {
  const hasDateFilter = Boolean(filters.from || filters.to);
  return prisma.booking.findMany({
    where: {
      hostId,
      status: filters.status,
      ...(hasDateFilter && {
        slot: {
          startAt: {
            gte: filters.from,
            lte: filters.to,
          },
        },
      }),
    },
    include: {
      slot: true,
      eventType: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      slot: { startAt: "asc" },
    },
  });
}
