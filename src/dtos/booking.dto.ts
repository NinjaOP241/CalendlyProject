import { z } from "zod";

export const createBookingSchema = z.object({
  slotId: z.string(),
  inviteeName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  inviteeEmail: z.email("Invalid email address"),
  inviteeNotes: z.string().optional(),
});

export type CreateBookingDTO = z.infer<typeof createBookingSchema>;
