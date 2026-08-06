import { z } from "zod";
import { BookingStatus } from "../../generated/prisma/enums.js";

const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const createBookingSchema = z.object({
  slotId: z.string(),
  inviteeName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  inviteeEmail: z.email("Invalid email address"),
  inviteeNotes: z.string().optional(),
});

export const listHostBookingsQuerySchema = z.object({
  status: z.enum(BookingStatus).optional(),
  from: z
    .string()
    .regex(dateRegex, "from must be in YYYY-MM-DD format")
    .optional(),
  to: z.string().regex(dateRegex, "to must be in YYYY-MM-DD format").optional(),
});

export type CreateBookingDTO = z.infer<typeof createBookingSchema>;
export type ListHostBookingsQueryDTO = z.infer<
  typeof listHostBookingsQuerySchema
>;
