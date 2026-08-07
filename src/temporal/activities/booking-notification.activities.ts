import { sendBookingConfirmationEmail } from "../../mailer/booking.mailer.js";

export async function sendBookingConfirmationEmailActivity(
  bookingId: number,
): Promise<void> {
  await sendBookingConfirmationEmail(bookingId);
}
