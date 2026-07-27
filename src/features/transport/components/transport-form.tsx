"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  transportFormSchema,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABELS,
  type TransportFormInput,
} from "@/features/transport/schemas/transport.schema";
import type { TransportDetail } from "@/features/transport/queries/get-transport.query";
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

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  provider?: TransportDetail;
  onSubmit: (values: TransportFormInput) => Promise<{ ok: boolean; error?: string; data?: { providerId: string } }>;
  locale: Locale;
};

export function TransportForm({ mode, tenantSlug, provider, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).transport.form;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TransportFormInput>({
    resolver: zodResolver(transportFormSchema),
    defaultValues: {
      name: provider?.name ?? "",
      type: provider?.type ?? "PRIVATE",
      country: provider?.country ?? "",
      city: provider?.city ?? "",
      contactName: provider?.contactName ?? "",
      contactEmail: provider?.contactEmail ?? "",
      contactPhone: provider?.contactPhone ?? "",
      website: provider?.website ?? "",
      fleetNotes: provider?.fleetNotes ?? "",
      pricingNotes: provider?.pricingNotes ?? "",
      internalNotes: provider?.internalNotes ?? "",
    },
  });

  function handleSubmit(values: TransportFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/transport/${result.data.providerId}/edit`);
      } else {
        toast.success(dict.saved);
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.companyName}</FormLabel>
                <FormControl>
                  <Input placeholder="Atlas Transfers" {...field} />
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
                <FormLabel>{dict.type}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TRANSPORT_TYPE_LABELS[t]}
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
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.city}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.country}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contactName}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contactEmail}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contactPhone}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.website}</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fleetNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.fleetNotes}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={dict.fleetNotesPlaceholder}
                    className="min-h-[80px]"
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
            name="pricingNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.pricingNotes}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={dict.pricingNotesPlaceholder}
                    className="min-h-[80px]"
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
                <FormLabel>
                  {dict.internalNotes}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({dict.notShownToCustomers})
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea className="min-h-[60px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : mode === "create" ? dict.createProvider : dict.save}
        </Button>
      </form>
    </Form>
  );
}
