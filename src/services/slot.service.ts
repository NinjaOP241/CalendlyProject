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

  // Convert the "from" and "to" into a DateTime format
  const from = input.from
    ? DateTime.fromISO(input.from, { zone: "utc" }).startOf("day") // for example: "2026-08-01" -> 2026-08-01T00:00:00.000Z
    : DateTime.now().startOf("day").toUTC(); // for example: Today at 00:00:00.000Z

  const to = input.to
    ? DateTime.fromISO(input.to, { zone: "utc" }).endOf("day") // for example: "2026-08-07" -> 2026-08-07T23:59:59.999Z (One millisecond before midnight ends)
    : from.plus({ days: SLOT_GENERATION_DAYS }).endOf("day").toUTC(); // for example: 30 days from today at 23:59:59.999Z

  /**
   * Fetch all the necessary data in parallel
   * 1. Fetch all the active rules for the host
   * 2. Fetch all the exceptions for the host in the given range
   * 3. Fetch all the active event types for the host
   * 4. Fetch all the booked slots for the host in the given range
   */
  const [rules, exceptions, eventTypes, bookedSlots] = await Promise.all([
    findActiveRulesByUser(input.hostId),
    findExceptionsByUserInRange(input.hostId, from.toJSDate(), to.toJSDate()),
    findActiveEventTypesByHost(input.hostId),
    findBookedSlotsByHostInRange(input.hostId, from.toJSDate(), to.toJSDate()),
  ]);

  // Convert the booked slots into time windows which is compatible with luxon
  const bookedWindows: TimeWindow[] = bookedSlots.map((bookedSlot) => {
    return {
      start: DateTime.fromJSDate(bookedSlot.startAt, { zone: "utc" }),
      end: DateTime.fromJSDate(bookedSlot.endAt, { zone: "utc" }),
    };
  });

  // For each event type, generate the slots and store them in the database
  for (const eventType of eventTypes) {
    /**
     * @generatedValidKeys is a set of keys that represent the slots that are generated in this run.
     * The key is a combination of eventTypeId, startAt, and endAt.
     * This is used to determine which slots are no longer valid and should be blocked.
     *
     * Invalid slots = All slots currently in the DB - valid slots generated in this run.
     */
    const generatedValidKeys = new Set<string>();

    // Loop through each day in the given range and generate the slots for that day
    for (let cursor = from; cursor <= to; cursor = cursor.plus({ days: 1 })) {
      // Get the date key for the current cursor date in the format of YYYY-MM-DD
      const dateKey = cursor.toISODate(); // for example: 2026-06-1

      // Filter the exceptions for the current cursor date and convert them into a format that is compatible with luxon
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

      // Generate the time windows for the current cursor date based on the rules
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

      /**
       * Apply any exceptions for the current date to the generated time windows.
       * The resulting windows represent the actual availability for that date.
       */
      windows = applyExceptionForDate(
        cursor,
        windows,
        dayExceptionsWithTimeZone,
      );

      /**
       * Split the available time windows into bookable slots based on
       * the event type's duration and buffer times.
       */
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

      // Loop through the generated slots and upsert them into the database
      for (const slot of slots) {
        const startAt = slot.start.toUTC().toJSDate();
        const endAt = slot.end.toUTC().toJSDate();

        const key = `${eventType.id}|${startAt.toISOString()}|${endAt.toISOString()}`;

        generatedValidKeys.add(key);

        upsertAvailableSlot(input.hostId, eventType.id, startAt, endAt);
      }
    }

    /**
     * After generating all the slots for the given range, we need to find the existing slots in the database
     * and compare them with the generated slots. If any existing slot is not in the generated slots,
     * it means that slot is no longer valid and should be blocked.
     */
    const existingAvailableSlots = await findAvailableSlotsInRange(
      eventType.id,
      from.toJSDate(),
      to.toJSDate(),
    );

    // Loop through the existing slots and check if they are in the generated slots
    for (const slot of existingAvailableSlots) {
      const key = `${eventType.id}|${slot.startAt.toISOString()}|${slot.endAt.toISOString()}`;

      // If the key is not in the generatedValidKeys set, it means this slot is no longer valid and should be blocked
      if (!generatedValidKeys.has(key)) {
        await blockSlot(slot.id);
      }
    }
  }
}
