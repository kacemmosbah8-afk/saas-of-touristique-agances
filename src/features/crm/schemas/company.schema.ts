import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalText(40),
  website: optionalText(200),
  taxId: optionalText(60),
  industry: optionalText(100),
  notes: optionalText(5000),
});
export type CompanyFormInput = z.infer<typeof companyFormSchema>;

export const updateCompanyStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateCompanyStatusInput = z.infer<typeof updateCompanyStatusSchema>;

export const listCompaniesFiltersSchema = baseListFiltersSchema;
export type ListCompaniesFilters = z.infer<typeof listCompaniesFiltersSchema>;
