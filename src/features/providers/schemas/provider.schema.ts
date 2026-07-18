import { z } from "zod";

export const PROVIDER_TYPE_VALUES = [
  "AMADEUS",
  "HOTELBEDS",
  "BOOKING",
  "EXPEDIA",
  "TRAVELPORT",
  "SABRE",
  "GOGLOBAL",
  "TBO",
  "JUNIPER",
  "TRAVELPAYOUTS",
] as const;

export const CREDENTIAL_TYPE_VALUES = [
  "API_KEY",
  "API_SECRET",
  "OAUTH_TOKEN",
  "REFRESH_TOKEN",
  "CERTIFICATE",
  "USERNAME",
  "PASSWORD",
  "ENDPOINT",
] as const;

export const enableProviderSchema = z.object({
  type: z.enum(PROVIDER_TYPE_VALUES),
});
export type EnableProviderInput = z.infer<typeof enableProviderSchema>;

export const updateConnectionSchema = z.object({
  environment: z.enum(["SANDBOX", "PRODUCTION"]),
  authType: z.enum(["OAUTH", "API_KEY", "SECRET", "CERTIFICATE"]),
  baseUrl: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
  autoReconnect: z.boolean(),
});
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;

export const saveCredentialSchema = z.object({
  type: z.enum(CREDENTIAL_TYPE_VALUES),
  value: z.string().min(1, "Value is required").max(10_000),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
});
export type SaveCredentialInput = z.infer<typeof saveCredentialSchema>;

export const webhookSchema = z.object({
  event: z.string().trim().min(1, "Event is required").max(100),
  url: z.string().trim().url("Invalid URL"),
  secret: z.string().trim().max(200).optional().or(z.literal("")),
});
export type WebhookInput = z.infer<typeof webhookSchema>;
