import { z } from "zod";
import { AvailabilityExceptionType } from "../../generated/prisma/enums.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm 24-hour format
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // YYYY-MM-DD

// Define the schema for creating a availability rule
export const createAvailabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Start time must be in HH:mm format"),
  endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),
  isActive: z.boolean().default(true),
  timezone: z.string().default("UTC"),
});

// Define the schema for updating a availability rule
export const updateAvailabilityRuleSchema =
  createAvailabilityRuleSchema.partial();

// Define the schema for creating a availability exception
export const createAvailabilityExceptionSchema = z
  .object({
    date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),

    // Use the Prisma enum directly for type safety
    type: z.enum(AvailabilityExceptionType, {
      error: "Invalid availability exception type",
    }),

    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format")
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, "End time must be in HH:mm format")
      .optional(),
    timezone: z.string().default("UTC"),
    reason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. CONDITIONAL REQUIREMENT:
    // If it is NOT a full day block, startTime and endTime are mandatory.
    if (data.type !== AvailabilityExceptionType.BLOCK_FULL_DAY) {
      if (!data.startTime) {
        ctx.addIssue({
          code: "custom",
          message: "startTime is required for partial blocks or adding windows",
          path: ["startTime"],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "endTime is required for partial blocks or adding windows",
          path: ["endTime"],
        });
      }
    }

    // 2. LOGICAL TIME CHECK:
    // If both times are provided, startTime must be strictly before endTime.
    if (data.startTime && data.endTime) {
      // Because we use 24-hour HH:mm format, standard string comparison works perfectly!
      // e.g., "09:00" < "14:00" is true.
      if (data.startTime >= data.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "startTime must be earlier than endTime",
          path: ["startTime"],
        });
      }
    }

    // 3. If it IS a full day block, we shouldn't accept times to prevent conflicting data.
    if (data.type === AvailabilityExceptionType.BLOCK_FULL_DAY) {
      if (data.startTime || data.endTime) {
        ctx.addIssue({
          code: "custom",
          message:
            "startTime and endTime should not be provided for a full day block",
          path: ["type"],
        });
      }
    }
  });

// Define the schema for updating a availability exception
export const updateAvailabilityExceptionSchema =
  createAvailabilityExceptionSchema.partial();

// Create a TypeScript type from the Zod schema for creating and updating an availability rule
export type CreateAvailabilityRuleDTO = z.infer<
  typeof createAvailabilityRuleSchema
>;
export type UpdateAvailabilityRuleDTO = z.infer<
  typeof updateAvailabilityRuleSchema
>;

// Create a TypeScript type from the Zod schema for creating and updating an availability exception
export type CreateAvailabilityExceptionDTO = z.infer<
  typeof createAvailabilityExceptionSchema
>;
export type UpdateAvailabilityExceptionDTO = z.infer<
  typeof updateAvailabilityExceptionSchema
>;
