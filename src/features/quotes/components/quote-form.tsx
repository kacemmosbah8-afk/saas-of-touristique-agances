"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { quoteFormSchema, type QuoteFormInput } from "@/features/quotes/schemas/quote.schema";
import type { QuoteDetail } from "@/features/quotes/queries/get-quote.query";
import type {
  CustomerOption,
  PackageOption,
} from "@/features/bookings/queries/booking-options.query";
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
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

const NONE = "__none__";

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  quote?: QuoteDetail;
  customers: CustomerOption[];
  packages: PackageOption[];
  members: MemberOption[];
  onSubmit: (
    values: QuoteFormInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { quoteId: string } }>;
  locale: Locale;
};

export function QuoteForm({
  mode,
  tenantSlug,
  quote,
  customers,
  packages,
  members,
  onSubmit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).quotes.form;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuoteFormInput>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customerId: quote?.customerId ?? "",
      packageId: quote?.packageId ?? "",
      ownerId: quote?.ownerId ?? "",
      validUntil: toDateInput(quote?.validUntil),
      travelStartDate: toDateInput(quote?.travelStartDate),
      travelEndDate: toDateInput(quote?.travelEndDate),
      adults: quote?.adults ?? 1,
      children: quote?.children ?? 0,
      currency: quote?.currency ?? "USD",
      discount: quote?.discount ?? 0,
      tax: quote?.tax ?? 0,
      notes: quote?.notes ?? "",
      terms: quote?.terms ?? "",
      internalNotes: quote?.internalNotes ?? "",
    },
  });

  function handleSubmit(values: QuoteFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/quotes/${result.data.quoteId}`);
      } else {
        toast.success(dict.saved);
        router.refresh();
      }
    });
  }

  const numeric =
    (onChange: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(e.target.value === "" ? 0 : Number(e.target.value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.customer}</FormLabel>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.selectCustomer} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
            name="packageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.packageOptional}</FormLabel>
                <Select
                  value={field.value ? field.value : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.noPackage} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{dict.noPackage}</SelectItem>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
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
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.validUntil}</FormLabel>
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
                <FormLabel>{dict.agent}</FormLabel>
                <Select
                  value={field.value ? field.value : NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.unassigned} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{dict.unassigned}</SelectItem>
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
            name="travelStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.travelStart}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="travelEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.travelEnd}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    min={form.watch("travelStartDate") || undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="adults"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.adults}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} onChange={numeric(field.onChange)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="children"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.children}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} onChange={numeric(field.onChange)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.currency}</FormLabel>
                  <FormControl>
                    <Input maxLength={3} className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.discount}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={numeric(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.tax}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={numeric(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.customerFacingNotes}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[70px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.termsAndConditions}</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[70px]"
                    placeholder={dict.termsPlaceholder}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internalNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.internalNotes}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[70px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : mode === "create" ? dict.createQuote : dict.saveQuote}
        </Button>
      </form>
    </Form>
  );
}
