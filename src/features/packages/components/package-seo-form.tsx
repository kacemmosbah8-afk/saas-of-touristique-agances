"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  updatePackageSeoSchema,
  type UpdatePackageSeoInput,
} from "@/features/packages/schemas/package.schema";
import type { PackageDetail } from "@/features/packages/queries/get-package.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageSeoInput) => Promise<{ ok: boolean; error?: string }>;
  locale: Locale;
};

export function PackageSeoForm({ pkg, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).packages.seoForm;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageSeoInput>({
    resolver: zodResolver(updatePackageSeoSchema),
    defaultValues: {
      seoTitle: pkg.seoTitle ?? "",
      seoDescription: pkg.seoDescription ?? "",
    },
  });

  const seoTitle = form.watch("seoTitle") ?? "";
  const seoDesc = form.watch("seoDescription") ?? "";

  function handleSubmit(values: UpdatePackageSeoInput) {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="seoTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.seoTitleAr}</FormLabel>
              <FormControl>
                <Input placeholder={pkg.name} {...field} value={field.value ?? ""} disabled={isPending} />
              </FormControl>
              <FormDescription>{dict.charsCount(seoTitle.length)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seoDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.seoDescriptionAr}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={pkg.shortDescription ?? pkg.description ?? ""}
                  className="min-h-[100px]"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{dict.charsCount(seoDesc.length)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Live preview */}
        {(seoTitle || seoDesc) && (
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
              {dict.previewAr}
            </p>
            <p className="text-[#1a0dab] text-base font-medium">
              {seoTitle || pkg.name}
            </p>
            <p className="text-muted-foreground text-sm">
              {seoDesc || pkg.shortDescription || pkg.description || dict.noDescription}
            </p>
          </div>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : dict.saveSeo}
        </Button>
      </form>
    </Form>
  );
}
