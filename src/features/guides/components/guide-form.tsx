"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  guideFormSchema,
  type GuideFormInput,
} from "@/features/guides/schemas/guide.schema";
import type { GuideDetail } from "@/features/guides/queries/get-guide.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ListEditor } from "@/shared/components/data/list-editor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  guide?: GuideDetail;
  onSubmit: (values: GuideFormInput) => Promise<{ ok: boolean; error?: string; data?: { guideId: string } }>;
  locale: Locale;
};

export function GuideForm({ mode, tenantSlug, guide, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).guides.form;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<GuideFormInput>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: {
      name: guide?.name ?? "",
      languages: guide?.languages ?? [],
      certifications: guide?.certifications ?? [],
      experienceYears: guide?.experienceYears ?? undefined,
      dailyRate: guide?.dailyRate ?? undefined,
      currency: guide?.currency ?? "USD",
      country: guide?.country ?? "",
      city: guide?.city ?? "",
      contactEmail: guide?.contactEmail ?? "",
      contactPhone: guide?.contactPhone ?? "",
      availabilityNotes: guide?.availabilityNotes ?? "",
      internalNotes: guide?.internalNotes ?? "",
    },
  });

  function handleSubmit(values: GuideFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/guides/${result.data.guideId}/edit`);
      } else {
        toast.success(dict.saved);
        router.refresh();
      }
    });
  }

  const numeric = (onChange: (v: number | undefined) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : Number(e.target.value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.guideName}</FormLabel>
                <FormControl>
                  <Input placeholder="Youssef El Amrani" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem className="sm:col-span-2">
            <FormLabel>{dict.languages}</FormLabel>
            <Controller
              control={form.control}
              name="languages"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={dict.languagesPlaceholder}
                  disabled={isPending}
                  locale={locale}
                />
              )}
            />
          </FormItem>

          <FormItem className="sm:col-span-2">
            <FormLabel>{dict.certifications}</FormLabel>
            <Controller
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={dict.certificationsPlaceholder}
                  disabled={isPending}
                  locale={locale}
                />
              )}
            />
          </FormItem>

          <FormField
            control={form.control}
            name="experienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.experienceYears}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    placeholder="8"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.dailyRate}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="150"
                      {...field}
                      value={field.value ?? ""}
                      onChange={numeric(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>

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
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.email}</FormLabel>
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
                <FormLabel>{dict.phone}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availabilityNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.availabilityNotes}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={dict.availabilityPlaceholder}
                    className="min-h-[70px]"
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
          {isPending ? dict.saving : mode === "create" ? dict.createGuide : dict.save}
        </Button>
      </form>
    </Form>
  );
}
