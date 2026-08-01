import { DateTime } from "luxon";
import { SLOT_GENERATION_DAYS } from "../config/env.js";

import { getById as getHostByIdRepo } from "../repositories/user.repository.js";
import {
  findActiveRulesByUser,
  findExceptionsByUserInRange,
} from "../repositories/availability.repository.js";
import { findActiveEventTypesByHost } from "../repositories/event-type.repository.js";
import {
  blockSlot,
  findAvailableSlotsInRange,
  findBookedSlotsByHostInRange,
  upsertAvailableSlot,
} from "../repositories/slot.repository.js";
import {
  applyExceptionForDate,
  overlapsBooked,
  splitIntoSlots,
  TimeWindow,
  windowsForWeekdayRule,
} from "./slot-generation.service.js";

export interface RegenerateHostSlotsInput {
  hostId: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export async function regenerateHostSlots(input: RegenerateHostSlotsInput) {
  const host = await getHostByIdRepo(input.hostId);
  if (!host) return;

  // Convert the from and to into a DateTime format
  const from = input.from
    ? DateTime.fromISO(input.from, { zone: "utc" }).startOf("day") // for example: "2026-08-01" -> 2026-08-01T00:00:00.000Z
    : DateTime.now().startOf("day"); // for example: Today at 00:00:00.000Z

  const to = input.to
    ? DateTime.fromISO(input.to, { zone: "utc" }).endOf("day") // for example: "2026-08-07" -> 2026-08-07T23:59:59.999Z (One millisecond before midnight ends)
    : from.plus({ days: SLOT_GENERATION_DAYS }).endOf("day"); // for example: 30 days from today at 23:59:59.999Z

  const [rules, exceptions, eventTypes, bookedSlots] = await Promise.all([
    findActiveRulesByUser(input.hostId),
    findExceptionsByUserInRange(input.hostId, from.toJSDate(), to.toJSDate()),
    findActiveEventTypesByHost(input.hostId),
    findBookedSlotsByHostInRange(input.hostId, from.toJSDate(), to.toJSDate()),
  ]);

  // Convert booked slots into time windows which is DateTime object (compatible with luxon)
  const bookedWindows: TimeWindow[] = bookedSlots.map((bookedSlot) => {
    return {
      start: DateTime.fromJSDate(bookedSlot.startAt, { zone: "utc" }),
      end: DateTime.fromJSDate(bookedSlot.endAt, { zone: "utc" }),
    };
  });

  for (const eventType of eventTypes) {
    const generatedValidKeys = new Set<string>();

    // Generate all the new slots
    for (let cursor = from; cursor <= to; cursor = cursor.plus({ days: 1 })) {
      // find the current date
      const dateKey = cursor.toISODate(); // for example: 2026-06-1

      // find the exceptions for the current date
      const dayExceptions = exceptions.filter(
        (exception) =>
          DateTime.fromJSDate(exception.date, { zone: "utc" }).toISODate() ===
          dateKey,
      );
      const dayExceptionsWithTimeZone = dayExceptions.map((exception) => ({
        type: exception.type,
        startTime: exception.startTime,
        endTime: exception.endTime,
        timeZone: exception.timezone,
      }));

      // Convert rules into time windows which is compatible with luxon
      let windows: TimeWindow[] = [];
      for (const rule of rules) {
        windows.push(
          ...windowsForWeekdayRule(
            cursor,
            rule.weekday,
            rule.startTime,
            rule.endTime,
            rule.timezone,
          ),
        );
      }

      // Apply the exceptions
      windows = applyExceptionForDate(
        cursor,
        windows,
        dayExceptionsWithTimeZone,
      );

      // Split all the windows into bookable slots
      const slots = splitIntoSlots(
        windows,
        eventType.durationMinutes,
        eventType.bufferBeforeMinutes,
        eventType.bufferAfterMinutes,
      ).filter(
        (slot) =>
          slot.start > DateTime.utc() &&
          !overlapsBooked(
            slot,
            bookedWindows,
            eventType.bufferBeforeMinutes,
            eventType.bufferAfterMinutes,
          ),
      ); // slots filtered to exclude the past slots and slots that overlap with booked slots

      // Store the slots in the database
      for (const slot of slots) {
        const startAt = slot.start.toUTC().toJSDate();
        const endAt = slot.end.toUTC().toJSDate();

        const key = `${eventType.id}|${startAt.toISOString()}|${endAt.toISOString()}`;

        generatedValidKeys.add(key);

        upsertAvailableSlot(input.hostId, eventType.id, startAt, endAt);
      }
    }

    // Invalid slots = All slots currently in the DB - new slots generated
    const existingAvailableSlots = await findAvailableSlotsInRange(
      eventType.id,
      from.toJSDate(),
      to.toJSDate(),
    );

    for (const slot of existingAvailableSlots) {
      const key = `${eventType.id}|${slot.startAt.toISOString()}|${slot.endAt.toISOString()}`;

      if (!generatedValidKeys.has(key)) {
        // this slot is no longer valid
        await blockSlot(slot.id);
      }
    }
  }
}
