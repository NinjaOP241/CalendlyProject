import { z } from "zod";

// Define the schema for creating a user
export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(40, "Name must be at most 40 characters"),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(60, "Handle must be at most 60 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Handle can only contain letters, numbers, underscores, and hyphens",
    )
    .optional(),
});

// Define the schema for updating a user
export const updateUserSchema = z
  .object({
    email: z.email("Invalid email address").optional(),
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(40, "Name must be at most 40 characters")
      .optional(),
    handle: z
      .string()
      .min(3, "Handle must be at least 3 characters")
      .max(60, "Handle must be at most 60 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Handle can only contain letters, numbers, underscores, and hyphens",
      )
      .optional(),
  })
  .refine((data) => data.email || data.name || data.handle, {
    message:
      "At least one field (email, name, or handle) must be provided for update",
  });

// Create a TypeScript type from the Zod schema
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
