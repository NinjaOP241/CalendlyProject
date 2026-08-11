import { updateBookingCalendarDetails } from "../../repositories/booking.repository.js";
import {
  createGoogleCalendarEvent,
  isProjectCalendarConfigured,
} from "../../services/google-calender.service.js";

export async function createGoogleCalendarEventActivity(
  bookingId: number,
): Promise<void> {
  if (!isProjectCalendarConfigured()) {
    console.warn(
      "[temporal] Google Calendar not configured, skipping event creation",
    );
    return;
  }

  const event = await createGoogleCalendarEvent(bookingId);

  await updateBookingCalendarDetails(bookingId, {
    meetLink: event.meetLink,
    calendarEventId: event.calendarEventId,
  });
}
