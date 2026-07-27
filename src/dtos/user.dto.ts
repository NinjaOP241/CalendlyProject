import { z } from "zod";

// Define the schema for creating a user
export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
});

// Define the schema for updating a user
export const updateUserSchema = z
  .object({
    email: z.email("Invalid email address").optional(),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters")
      .optional(),
  })
  .refine((data) => data.email || data.name, {
    message: "At least one field must be provided",
  });

// Create a TypeScript type from the Zod schema
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
