import { z } from "zod";
import { AvailabilityExceptionType } from "../../generated/prisma/enums.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm 24-hour format
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // YYYY-MM-DD

// ==========================================
// SHARED VALIDATION HELPERS
// ==========================================

// Helper 1: Validates that start time comes before end time (if both exist)
const validateTimeOrder = (
  data: {
    startTime?: string;
    endTime?: string;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    ctx.addIssue({
      code: "custom",
      message: "startTime must be earlier than endTime",
      path: ["startTime"],
    });
  }
};

// Helper 2: Validates that full-day blocks don't contain specific times
const validateFullDayConflicts = (
  data: {
    type?: AvailabilityExceptionType;
    startTime?: string;
    endTime?: string;
  },
  ctx: z.RefinementCtx,
) => {
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
};

// ==========================================
// 1. AVAILABILITY RULES
// ==========================================

// Define the base unrefined schema first
const createAvailabilityRuleBaseSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Start time must be in HH:mm format"),
  endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),
  isActive: z.boolean().default(true),
  timezone: z.string().default("UTC"),
});

// Define the creation schema with custom refinement
export const createAvailabilityRuleSchema =
  createAvailabilityRuleBaseSchema.superRefine(validateTimeOrder);

// Define the update schema from the base object
export const updateAvailabilityRuleSchema = createAvailabilityRuleBaseSchema
  .partial()
  .superRefine(validateTimeOrder);

// ==========================================
// 2. AVAILABILITY EXCEPTIONS
// ==========================================

// Define the base unrefined schema first
const createAvailabilityExceptionBaseSchema = z.object({
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
});

// Define the creation schema with custom refinement
export const createAvailabilityExceptionSchema =
  createAvailabilityExceptionBaseSchema.superRefine((data, ctx) => {
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

    validateTimeOrder(data, ctx);
    validateFullDayConflicts(data, ctx);
  });

// Define the update schema from the base object
export const updateAvailabilityExceptionSchema =
  createAvailabilityExceptionBaseSchema.partial().superRefine((data, ctx) => {
    validateTimeOrder(data, ctx);
    validateFullDayConflicts(data, ctx);
  });

// ==========================================
// 3. TYPESCRIPT TYPES
// ==========================================

export type CreateAvailabilityRuleDTO = z.infer<
  typeof createAvailabilityRuleSchema
>;
export type UpdateAvailabilityRuleDTO = z.infer<
  typeof updateAvailabilityRuleSchema
>;
export type CreateAvailabilityExceptionDTO = z.infer<
  typeof createAvailabilityExceptionSchema
>;
export type UpdateAvailabilityExceptionDTO = z.infer<
  typeof updateAvailabilityExceptionSchema
>;
