import { z } from "zod";

/**
 * The hostId is not included in the DTO because it is expected to be provided
 * by the authenticated user context, not by the client.
 * The client should not be able to specify the hostId directly for security reasons.
 */

// Define the schema for creating an event type
export const createEventTypeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  durationMinutes: z
    .union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(120),
    ])
    .default(30),
  isActive: z.boolean().default(true),
  locationType: z.enum(["online", "in-person"]).default("online"),
  locationValue: z.string().optional(),
  bufferBeforeMinutes: z.number().min(0).max(120).default(0),
  bufferAfterMinutes: z.number().min(0).max(120).default(0),
  slug: z
    .string()
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
});

// Define the schema for updating an event type
export const updateEventTypeSchema = createEventTypeSchema.partial();

// Create a TypeScript type from the Zod schema
export type CreateEventTypeDTO = z.infer<typeof createEventTypeSchema>;
export type UpdateEventTypeDTO = z.infer<typeof updateEventTypeSchema>;
