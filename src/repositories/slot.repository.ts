import { prisma } from "../config/database.js";
import { SlotStatus } from "../../generated/prisma/enums.js";

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
