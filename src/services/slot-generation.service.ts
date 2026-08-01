import { DateTime, Interval } from "luxon";
import { AvailabilityExceptionType } from "../../generated/prisma/enums.js";

export interface TimeWindow {
  start: DateTime;
  end: DateTime;
}

export interface Exception {
  type: AvailabilityExceptionType;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
}

/**
 * Takes a generic date, a time string (like "09:30"), and a timezone, and
 * fuses them together into a precise, math-ready Luxon DateTime object.
 *
 * @example
 * Input: date(2026-08-01), time("09:30"), timezone("Asia/Kolkata")
 * Output: Exact DateTime object representing Aug 1, 2026 at 9:30 AM in Kolkata.
 */
export function parseTimeOnDate(
  date: DateTime,
  time: string,
  timezone: string,
) {
  // "09:30" -> ["09", "30"] -> [9, 30]
  const [hour, minute] = time.split(":").map(Number);
  return date.setZone(timezone).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
}

/**
 * Merges overlapping time windows into single, continuous blocks of time.
 * This fixes issues where a host accidentally enters overlapping availability.
 *
 * @example
 * Input: [ { 09:00 - 12:00 }, { 11:00 - 14:00 } ]
 * Output: [ { 09:00 - 14:00 } ] (Merged into one big block)
 */
export function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length === 0) return [];

  const sortedWindows = [...windows].sort(
    (a, b) => a.start.toMillis() - b.start.toMillis(),
  );

  const mergedResult: TimeWindow[] = [sortedWindows[0]];

  for (let i = 1; i < sortedWindows.length; i++) {
    const currentWindow = sortedWindows[i];
    const prevWindow = mergedResult[mergedResult.length - 1];

    if (prevWindow.end < currentWindow.start) {
      mergedResult.push(currentWindow);
    } else if (currentWindow.end > prevWindow.end) {
      prevWindow.end = currentWindow.end;
    }
  }
  return mergedResult;
}

/**
 * Chops up a giant block of free time into individual, bookable meeting slots.
 * It automatically calculates how much total time is needed (buffers + meeting)
 * and slices the free time accordingly.
 *
 * @example
 * Window: 09:00 - 11:00 | Duration: 30m | Buffers: 5m before & after (Total: 40m needed)
 * Output: [ { 09:05 - 09:35 }, { 09:35 - 10:05 }, { 10:05 - 10:35 } ]
 */
export function splitIntoSlots(
  windows: TimeWindow[],
  durationMinutes: number,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
): TimeWindow[] {
  const slots: TimeWindow[] = [];

  const totalMinutes =
    bufferBeforeMinutes + durationMinutes + bufferAfterMinutes;

  for (const window of windows) {
    let cursor = window.start;
    while (cursor.plus({ minutes: totalMinutes }) <= window.end) {
      const slotStart = cursor.plus({ minutes: bufferBeforeMinutes });
      const slotEnd = slotStart.plus({ minutes: durationMinutes });

      slots.push({ start: slotStart, end: slotEnd });

      cursor = cursor.plus({ minutes: durationMinutes });
    }
  }

  return slots;
}

/**
 * Takes a host's available free time and "erases" any periods that are
 * already blocked out (like existing meetings, lunch breaks, etc.).
 *
 * @example
 * Available: [ { 09:00 - 17:00 } ]
 * Blocked: { 12:00 - 13:00 } (Lunch)
 * Output: [ { 09:00 - 12:00 }, { 13:00 - 17:00 } ] (Lunch is erased)
 */
export function subtractWindows(
  baseWindows: TimeWindow[] | TimeWindow,
  excludeWindows: TimeWindow[] | TimeWindow,
): TimeWindow[] {
  // Normalize inputs: If passed a single object, wrap it in an array
  const baseList = Array.isArray(baseWindows) ? baseWindows : [baseWindows];
  const excludeList = Array.isArray(excludeWindows)
    ? excludeWindows
    : [excludeWindows];

  if (baseList.length === 0) return [];
  if (excludeList.length === 0) return baseList;

  const sortedBase = [...mergeWindows(baseList)].sort(
    (a, b) => a.start.toMillis() - b.start.toMillis(),
  );
  const sortedExclude = [...mergeWindows(excludeList)].sort(
    (a, b) => a.start.toMillis() - b.start.toMillis(),
  );

  const remainingWindows: TimeWindow[] = [];
  let baseIdx = 0;
  let excludeIdx = 0;

  while (baseIdx < sortedBase.length && excludeIdx < sortedExclude.length) {
    const currentBase = sortedBase[baseIdx];
    const currentExclude = sortedExclude[excludeIdx];

    /**
     * CASE 1: Base window ends before exclude window starts (No overlap)
     * [currentBase.start     currentBase.end]  [currentExclude.start     currentExclude.end]
     */
    if (currentBase.end <= currentExclude.start) {
      remainingWindows.push(currentBase);
      baseIdx++; // Move to the next available window
    } else if (currentExclude.end <= currentBase.start) {
      /**
       * CASE 2: Exclude window ends before base window starts (No overlap)
       * [currentExclude.start     currentExclude.end]  [currentBase.start     currentBase.end]
       */
      excludeIdx++; // Move to next blocked window
    }
    // CASE 3: Overlap detected, slice the window
    else {
      /**
       * CASE 3.1: If there is free time BEFORE the blockage, save it!
       * [currentBase.start     currentBase.end]
       *              [currentExclude.start     currentExclude.end]
       *
       */
      if (currentBase.start < currentExclude.start) {
        remainingWindows.push({
          start: currentBase.start,
          end: currentExclude.start,
        });
      }

      // 3.2: Shrink the current window's start time to after the blockage.
      // We do NOT push it yet, because it might collide with the NEXT block (excludeIdx + 1)
      currentBase.start = currentExclude.end;

      // If the base window has been fully consumed, move to the next one
      if (currentBase.start >= currentBase.end) {
        baseIdx++;
      } else {
        // Otherwise, move to the next exclusion block to see if it cuts into the remainder
        excludeIdx++;
      }
    }
  }

  // Push any remaining untouched base windows
  while (baseIdx < sortedBase.length) {
    remainingWindows.push(sortedBase[baseIdx++]);
  }

  return remainingWindows;
}

/**
 * Checks if a user's requested meeting slot will crash into an already booked
 * meeting on the calendar. It stretches the requested slot by the buffer times
 * to make sure the host gets their required prep and rest time.
 *
 * @example
 * Booked: 09:15 - 09:45 | Buffers required: 15m
 * Candidate Slot: 09:45 - 10:15 -> Padded by 15m becomes -> 09:30 - 10:30
 * Does 09:30 overlap with 09:15? YES! Returns true (Collision detected, reject booking)
 */
export function overlapsBooked(
  slot: TimeWindow,
  bookedSlots: TimeWindow[],
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
): boolean {
  const paddedStart = slot.start.minus({ minutes: bufferBeforeMinutes });
  const paddedEnd = slot.end.plus({ minutes: bufferAfterMinutes });
  const interval = Interval.fromDateTimes(paddedStart, paddedEnd);

  return bookedSlots.some((bookedSlot) => {
    const bookedInterval = Interval.fromDateTimes(
      bookedSlot.start,
      bookedSlot.end,
    );

    return interval.overlaps(bookedInterval);
  });
}

/**
 * Applies special "date-specific rules" to a standard workday.
 * If a host usually works 9 to 5, but today is a holiday (BLOCK_FULL_DAY),
 * or they have a dentist appointment (BLOCK_PARTIAL), this alters the schedule.
 *
 * @example
 * Standard Day: 09:00 - 17:00
 * Exception: BLOCK_PARTIAL 14:00 - 16:00
 * Output: [ { 09:00 - 14:00 }, { 16:00 - 17:00 } ]
 */
export function applyExceptionForDate(
  date: DateTime,
  baseWindows: TimeWindow[],
  exceptions: Exception[],
): TimeWindow[] {
  let windows = [...baseWindows];

  for (const exception of exceptions) {
    if (exception.type === AvailabilityExceptionType.BLOCK_FULL_DAY) {
      return []; // No slots for this date
    }

    if (
      exception.type === AvailabilityExceptionType.BLOCK_PARTIAL &&
      exception.startTime &&
      exception.endTime
    ) {
      const block = {
        start: parseTimeOnDate(date, exception.startTime, exception.timeZone),
        end: parseTimeOnDate(date, exception.endTime, exception.timeZone),
      };

      windows = subtractWindows(windows, block);
    }

    if (
      exception.type === AvailabilityExceptionType.ADD_AVAILABLE_WINDOW &&
      exception.startTime &&
      exception.endTime
    ) {
      const block = {
        start: parseTimeOnDate(date, exception.startTime, exception.timeZone),
        end: parseTimeOnDate(date, exception.endTime, exception.timeZone),
      };

      windows.push(block);
    }
  }

  return mergeWindows(windows);
}

/**
 * Compares a specific calendar date against a general weekly database rule (e.g., "Mondays 9-5").
 * If the calendar date is the correct day of the week, it generates a precise time block.
 * If it is the wrong day of the week, it rejects it and returns an empty array.
 *
 * 1. Shifts the requested date to the host's timezone (since it might be Monday in NY, but Tuesday in Tokyo).
 * 2. Translates standard Sunday math (0) into Luxon's Sunday math (7).
 * 3. If the calendar date's day doesn't match the rule's day, it rejects it (returns []).
 * 4. If approved, it uses the "parseTimeOnDate" to paste the string times onto the specific date.
 *
 * @example
 * DB Rule: weekday 1 (Monday), "09:00" to "17:00"
 * Candidate Date: Aug 5, 2026 (Wednesday) -> Result: [] (Not a Monday)
 * Candidate Date: Aug 3, 2026 (Monday) -> Result: [ { 2026-08-03 09:00 to 17:00 } ] (Approved!)
 *
 * @param date - The specific calendar date the user clicked on.
 * @param weekday - The day of the week from the DB rule (0 = Sun, 1 = Mon, etc.).
 * @param startTime - The shift start time from the DB (e.g., "09:00").
 * @param endTime - The shift end time from the DB (e.g., "17:00").
 * @param timeZone - The host's configured timezone.
 * @returns A single TimeWindow array if it's the correct day, or an empty array if not.
 */
export function windowsForWeekdayRule(
  date: DateTime,
  weekday: number,
  startTime: string,
  endTime: string,
  timeZone: string,
): TimeWindow[] {
  const localDate = date.setZone(timeZone).startOf("day");
  const luxonWeekday = weekday === 0 ? 7 : weekday;

  if (localDate.weekday !== luxonWeekday) return [];

  const start = parseTimeOnDate(date, startTime, timeZone);
  const end = parseTimeOnDate(date, endTime, timeZone);

  if (!start.isValid || !end.isValid || start >= end) return [];

  return [{ start, end }];
}
