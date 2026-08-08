import { prisma } from "../config/database.js";
import { SlotStatus } from "../../generated/prisma/enums.js";
import { DbClient, getDbClient } from "./db-client.js";
import { Slot } from "../../generated/prisma/client.js";

export async function findBookedSlotsByHostInRange(
  hostId: number,
  startDate: Date,
  endDate: Date,
) {
  const bookedSlots = await prisma.slot.findMany({
    where: {
      hostId,
      startAt: {
        gte: startDate,
        lte: endDate,
      },
      status: SlotStatus.BOOKED,
    },
  });
  return bookedSlots;
}

export async function upsertAvailableSlot(
  hostId: number,
  eventTypeId: number,
  startAt: Date,
  endAt: Date,
) {
  return await prisma.slot.upsert({
    where: {
      eventTypeId_startAt_endAt: { eventTypeId, startAt, endAt },
    },
    create: {
      hostId,
      eventTypeId,
      startAt,
      endAt,
      status: SlotStatus.AVAILABLE,
    },
    update: {
      status: SlotStatus.AVAILABLE,
    },
  });
}

export async function findAvailableSlotsInRange(
  eventTypeId: number,
  startDate: Date,
  endDate: Date,
) {
  return await prisma.slot.findMany({
    where: {
      eventTypeId,
      startAt: { gte: startDate, lte: endDate },
      status: SlotStatus.AVAILABLE,
    },
  });
}

export async function blockSlot(id: string) {
  await prisma.slot.update({
    where: {
      id,
    },
    data: {
      status: SlotStatus.BLOCKED,
    },
  });
}

export async function findSlotById(id: string, db?: DbClient) {
  const client = getDbClient(db);

  return client.slot.findUnique({
    where: {
      id,
    },
  });
}

export async function markSlotBookedIfAvailable(id: string, db?: DbClient) {
  const client = getDbClient(db);
  return client.slot.updateMany({
    where: {
      id,
      status: SlotStatus.AVAILABLE,
    },
    data: {
      status: SlotStatus.BOOKED,
    },
  });
}

export async function markSlotBooked(id: string, db?: DbClient) {
  const client = getDbClient(db);
  return client.slot.update({
    where: {
      id,
    },
    data: {
      status: SlotStatus.BOOKED,
    },
  });
}

export async function markSlotAvailable(id: string, db?: DbClient) {
  const client = getDbClient(db);
  return client.slot.update({
    where: {
      id,
    },
    data: {
      status: SlotStatus.AVAILABLE,
    },
  });
}

export async function lockAndFetchSlot(id: string, db?: DbClient) {
  const client = getDbClient(db);

  const slots = await client.$queryRaw<Slot[]>`
    SELECT * 
    FROM slots
    WHERE id = ${id}
    FOR UPDATE
  `;

  return slots[0] || null;
}
