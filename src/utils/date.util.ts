/**
 * Safely parses a YYYY-MM-DD string into a UTC Date object.
 * Prevents timezone off-by-one shifts in database @db.Date fields.
 */
export function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
