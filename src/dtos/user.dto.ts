import { z } from "zod";

// Define the schema for creating a user
export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
});

// Create a TypeScript type from the Zod schema
export type CreateUserDTO = z.infer<typeof createUserSchema>;
