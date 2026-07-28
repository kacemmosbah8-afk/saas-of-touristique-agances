import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
