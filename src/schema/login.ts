import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "E-mail is required").email("Enter a valid e-mail"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const USERNAME_REGEX = /^[a-z0-9._-]+$/;

export const usernameZ = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((s) => s.toLowerCase())
  .refine((s) => USERNAME_REGEX.test(s), {
    message:
      'username can only contain lowercase letters, numbers, ".", "_", "-"',
  });
