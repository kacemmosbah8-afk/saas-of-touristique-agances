import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { LEAD_SOURCES } from "@/features/crm/schemas/customer.schema";

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const LEAD_STAGE_LABELS: Record<(typeof LEAD_STAGES)[number], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

/** Stages shown as pipeline columns (terminal stages get their own strip). */
export const PIPELINE_STAGES = LEAD_STAGES.filter(
  (s) => s !== "WON" && s !== "LOST",
);

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

export const leadFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  contactName: z.string().trim().min(1, "Contact name is required").max(150),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalText(40),
  source: z.enum(LEAD_SOURCES).optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  estimatedValue: z.number().min(0).max(100_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
  expectedCloseDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
  notes: optionalText(5000),
});
export type LeadFormInput = z.infer<typeof leadFormSchema>;

export const updateLeadStageSchema = z.object({
  stage: z.enum(LEAD_STAGES),
  lostReason: z.string().trim().max(500).optional(),
});
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;

export const assignLeadSchema = z.object({
  ownerId: z.string().optional().or(z.literal("")),
});
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

export const leadNoteSchema = z.object({
  body: z.string().trim().min(1, "Note is required").max(5000),
});
export type LeadNoteInput = z.infer<typeof leadNoteSchema>;

export const leadReminderSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  dueAt: z
    .string()
    .trim()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});
export type LeadReminderInput = z.infer<typeof leadReminderSchema>;

export const convertLeadSchema = z.object({
  /** Link to an existing customer instead of creating one. */
  existingCustomerId: z.string().cuid().optional().or(z.literal("")),
});
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const listLeadsFiltersSchema = baseListFiltersSchema.extend({
  stage: z.enum(LEAD_STAGES).or(z.literal("all")).optional(),
  owner: z.string().optional(),
});
export type ListLeadsFilters = z.infer<typeof listLeadsFiltersSchema>;
