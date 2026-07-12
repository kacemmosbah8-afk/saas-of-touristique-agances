import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2, "Enter your agency's name."),
  slug: z
    .string()
    .min(2, "Workspace URL must be at least 2 characters.")
    .max(48, "Workspace URL must be under 48 characters.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only.",
    ),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
