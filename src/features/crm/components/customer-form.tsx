"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  customerFormSchema,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  COMMUNICATION_PREFERENCES,
  COMMUNICATION_PREFERENCE_LABELS,
  type CustomerFormInput,
} from "@/features/crm/schemas/customer.schema";
import {
  findCustomerDuplicatesAction,
  type DuplicateMatch,
} from "@/features/crm/actions/customer.action";
import type { CustomerDetail } from "@/features/crm/queries/get-customer.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NONE = "__none__";

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

type Props = {
  mode: "create" | "edit";
  tenantId: string;
  tenantSlug: string;
  customer?: CustomerDetail;
  members: MemberOption[];
  onSubmit: (values: CustomerFormInput) => Promise<{ ok: boolean; error?: string; data?: { customerId: string } }>;
};

export function CustomerForm({
  mode,
  tenantId,
  tenantSlug,
  customer,
  members,
  onSubmit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  const form = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: customer?.firstName ?? "",
      lastName: customer?.lastName ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      type: customer?.type ?? "INDIVIDUAL",
      leadSource: customer?.leadSource ?? "",
      communicationPreference: customer?.communicationPreference ?? "EMAIL",
      dateOfBirth: toDateInput(customer?.dateOfBirth),
      nationality: customer?.nationality ?? "",
      passportNumber: customer?.passportNumber ?? "",
      passportExpiry: toDateInput(customer?.passportExpiry),
      ownerId: customer?.ownerId ?? "",
      notes: customer?.notes ?? "",
    },
  });

  async function checkDuplicates() {
    if (mode !== "create") return;
    const email = form.getValues("email")?.trim();
    const phone = form.getValues("phone")?.trim();
    if (!email && !phone) {
      setDuplicates([]);
      return;
    }
    const result = await findCustomerDuplicatesAction(tenantId, { email, phone });
    if (result.ok) setDuplicates(result.data.matches);
  }

  function handleSubmit(values: CustomerFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Customer created.");
        router.push(`/${tenantSlug}/admin/customers/${result.data.customerId}`);
      } else {
        toast.success("Saved.");
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {duplicates.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Possible duplicate{duplicates.length > 1 ? "s" : ""} found
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/${tenantSlug}/admin/customers/${d.id}`}
                      className="underline underline-offset-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.name}
                    </a>{" "}
                    — {[d.email, d.phone].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sara" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Benali" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="sara@example.com"
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => {
                      field.onBlur();
                      void checkDuplicates();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+212 …"
                    {...field}
                    value={field.value ?? ""}
                    onBlur={() => {
                      field.onBlur();
                      void checkDuplicates();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CUSTOMER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leadSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Source</FormLabel>
                <Select
                  value={field.value ? field.value : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unknown" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Unknown</SelectItem>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LEAD_SOURCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="communicationPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Contact</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMMUNICATION_PREFERENCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {COMMUNICATION_PREFERENCE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nationality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nationality</FormLabel>
                <FormControl>
                  <Input placeholder="Moroccan" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passportNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passport Number</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passportExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passport Expiry</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Manager</FormLabel>
                <Select
                  value={field.value ? field.value : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  General Notes{" "}
                  <span className="text-muted-foreground font-normal">(internal)</span>
                </FormLabel>
                <FormControl>
                  <Textarea className="min-h-[80px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Customer" : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
