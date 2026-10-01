import { z } from "zod";

export const emailSchema = z
  .email("Enter a valid email address")
  .trim()
  .toLowerCase()
  .max(254);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name or shop name").max(80),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "That password is too long"),
});

export type SignupInput = z.infer<typeof signupSchema>;
