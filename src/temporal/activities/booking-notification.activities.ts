import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
} from "../../mailer/booking.mailer.js";

export async function sendBookingConfirmationEmailActivity(
  bookingId: number,
): Promise<void> {
  await sendBookingConfirmationEmail(bookingId);
}

export async function sendBookingCancellationEmailActivity(
  bookingId: number,
): Promise<void> {
  await sendBookingCancellationEmail(bookingId);
}
