import { z } from "zod";

export const registerRequestSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72)
      .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  })
  .strict();

export const loginRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(1)
      .max(72)
      .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  })
  .strict();

export const sanitizedUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().email(),
});
