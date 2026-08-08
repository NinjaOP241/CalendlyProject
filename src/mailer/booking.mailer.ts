import { findBookingById } from "../repositories/booking.repository.js";
import { BookingStatus } from "../../generated/prisma/enums.js";
import { sendEmail } from "../config/nodemailer.js";

export async function sendBookingConfirmationEmail(bookingId: number) {
  const booking = await findBookingById(bookingId);

  if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

  const when = booking.slot.startAt.toUTCString();
  await sendEmail(
    booking.inviteeEmail,
    `Booking Confirmation : ${bookingId}`,
    `
    <p>Hello ${booking.inviteeName},</p>
    <p>Your booking for ${booking.eventType.title} on ${when} has been confirmed.</p>
    <p>Thank you for booking with us.</p>
    `,
  );
}

export async function sendBookingCancellationEmail(bookingId: number) {
  const booking = await findBookingById(bookingId);

  if (!booking || booking.status !== BookingStatus.CANCELLED) return;

  const when = booking.slot.startAt.toUTCString();
  await sendEmail(
    booking.inviteeEmail,
    `Booking Cancellation : ${bookingId}`,
    `
    <p>Hello ${booking.inviteeName},</p>
    <p>Your booking for ${booking.eventType.title} on ${when} has been cancelled.</p>
    <p>We’re sorry to see you go.</p>
    `,
  );
}
