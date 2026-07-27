"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  updatePackageBuilderSchema,
  type UpdatePackageBuilderInput,
} from "@/features/packages/schemas/package.schema";
import type { PackageDetail } from "@/features/packages/queries/get-package.query";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { ListEditor } from "@/features/packages/components/list-editor";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageBuilderInput) => Promise<{ ok: boolean; error?: string }>;
  locale: Locale;
};

export function PackageBuilderForm({ pkg, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).packages.builderForm;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageBuilderInput>({
    resolver: zodResolver(updatePackageBuilderSchema),
    defaultValues: {
      highlights: pkg.highlights,
      highlightsFr: pkg.highlightsFr,
      includedServices: pkg.includedServices,
      includedServicesFr: pkg.includedServicesFr,
      excludedServices: pkg.excludedServices,
      excludedServicesFr: pkg.excludedServicesFr,
      importantNotes: pkg.importantNotes,
      importantNotesFr: pkg.importantNotesFr,
      whatToBring: pkg.whatToBring,
      whatToBringFr: pkg.whatToBringFr,
      cancellationPolicy: pkg.cancellationPolicy ?? "",
      cancellationPolicyFr: pkg.cancellationPolicyFr ?? "",
      meetingPoint: pkg.meetingPoint ?? "",
      meetingPointFr: pkg.meetingPointFr ?? "",
    },
  });

  function handleSubmit(values: UpdatePackageBuilderInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      toast.success(dict.saved);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="highlights"
            render={() => (
              <FormItem>
                <FormLabel>{dict.highlightsAr}</FormLabel>
                <Controller
                  control={form.control}
                  name="highlights"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف نقطة بارزة…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="highlightsFr"
            render={() => (
              <FormItem>
                <FormLabel>{dict.highlightsFr}</FormLabel>
                <Controller
                  control={form.control}
                  name="highlightsFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un point fort…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormDescription>{dict.optionalFallsBackListAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="includedServices"
            render={() => (
              <FormItem>
                <FormLabel>{dict.includedAr}</FormLabel>
                <Controller
                  control={form.control}
                  name="includedServices"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف خدمة مشمولة…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="includedServicesFr"
            render={() => (
              <FormItem>
                <FormLabel>{dict.includedFr}</FormLabel>
                <Controller
                  control={form.control}
                  name="includedServicesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un service inclus…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormDescription>{dict.optionalFallsBackListAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="excludedServices"
            render={() => (
              <FormItem>
                <FormLabel>{dict.excludedAr}</FormLabel>
                <Controller
                  control={form.control}
                  name="excludedServices"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف خدمة غير مشمولة…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="excludedServicesFr"
            render={() => (
              <FormItem>
                <FormLabel>{dict.excludedFr}</FormLabel>
                <Controller
                  control={form.control}
                  name="excludedServicesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un service non inclus…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormDescription>{dict.optionalFallsBackListAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="importantNotes"
            render={() => (
              <FormItem>
                <FormLabel>{dict.importantNotesAr}</FormLabel>
                <Controller
                  control={form.control}
                  name="importantNotes"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف ملاحظة مهمة…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importantNotesFr"
            render={() => (
              <FormItem>
                <FormLabel>{dict.importantNotesFr}</FormLabel>
                <Controller
                  control={form.control}
                  name="importantNotesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter une note importante…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormDescription>{dict.optionalFallsBackListAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="whatToBring"
            render={() => (
              <FormItem>
                <FormLabel>{dict.whatToBringAr}</FormLabel>
                <Controller
                  control={form.control}
                  name="whatToBring"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف غرضًا يجب إحضاره…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whatToBringFr"
            render={() => (
              <FormItem>
                <FormLabel>{dict.whatToBringFr}</FormLabel>
                <Controller
                  control={form.control}
                  name="whatToBringFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un objet à apporter…"
                      disabled={isPending}
                      locale={locale}
                    />
                  )}
                />
                <FormDescription>{dict.optionalFallsBackListAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="meetingPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.meetingPointAr}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ردهة الفندق، صالة وصول المطار…"
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meetingPointFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.meetingPointFr}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Hall de l'hôtel, arrivées de l'aéroport…"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>{dict.optionalFallsBackAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cancellationPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.cancellationPolicyAr}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="إلغاء مجاني حتى 48 ساعة قبل المغادرة…"
                    className="min-h-[120px]"
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellationPolicyFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.cancellationPolicyFr}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Annulation gratuite jusqu'à 48 heures avant le départ…"
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>{dict.optionalFallsBackAr}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : dict.saveBuilderContent}
        </Button>
      </form>
    </Form>
  );
}
