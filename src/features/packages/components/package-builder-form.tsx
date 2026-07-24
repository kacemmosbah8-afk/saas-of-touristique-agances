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

type Props = {
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageBuilderInput) => Promise<{ ok: boolean; error?: string }>;
};

export function PackageBuilderForm({ pkg, onSubmit }: Props) {
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
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Builder content saved.");
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
                <FormLabel>Highlights (Arabic)</FormLabel>
                <Controller
                  control={form.control}
                  name="highlights"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف نقطة بارزة…"
                      disabled={isPending}
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
                <FormLabel>Highlights (French)</FormLabel>
                <Controller
                  control={form.control}
                  name="highlightsFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un point fort…"
                      disabled={isPending}
                    />
                  )}
                />
                <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
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
                <FormLabel>What&apos;s Included (Arabic)</FormLabel>
                <Controller
                  control={form.control}
                  name="includedServices"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف خدمة مشمولة…"
                      disabled={isPending}
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
                <FormLabel>What&apos;s Included (French)</FormLabel>
                <Controller
                  control={form.control}
                  name="includedServicesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un service inclus…"
                      disabled={isPending}
                    />
                  )}
                />
                <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
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
                <FormLabel>What&apos;s Not Included (Arabic)</FormLabel>
                <Controller
                  control={form.control}
                  name="excludedServices"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف خدمة غير مشمولة…"
                      disabled={isPending}
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
                <FormLabel>What&apos;s Not Included (French)</FormLabel>
                <Controller
                  control={form.control}
                  name="excludedServicesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un service non inclus…"
                      disabled={isPending}
                    />
                  )}
                />
                <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
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
                <FormLabel>Important Notes (Arabic)</FormLabel>
                <Controller
                  control={form.control}
                  name="importantNotes"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف ملاحظة مهمة…"
                      disabled={isPending}
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
                <FormLabel>Important Notes (French)</FormLabel>
                <Controller
                  control={form.control}
                  name="importantNotesFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter une note importante…"
                      disabled={isPending}
                    />
                  )}
                />
                <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
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
                <FormLabel>What to Bring (Arabic)</FormLabel>
                <Controller
                  control={form.control}
                  name="whatToBring"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="أضف غرضًا يجب إحضاره…"
                      disabled={isPending}
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
                <FormLabel>What to Bring (French)</FormLabel>
                <Controller
                  control={form.control}
                  name="whatToBringFr"
                  render={({ field }) => (
                    <ListEditor
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Ajouter un objet à apporter…"
                      disabled={isPending}
                    />
                  )}
                />
                <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
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
                <FormLabel>Meeting Point (Arabic)</FormLabel>
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
                <FormLabel>Meeting Point (French)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Hall de l'hôtel, arrivées de l'aéroport…"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
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
                <FormLabel>Cancellation Policy (Arabic)</FormLabel>
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
                <FormLabel>Cancellation Policy (French)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Annulation gratuite jusqu'à 48 heures avant le départ…"
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Builder Content"}
        </Button>
      </form>
    </Form>
  );
}
