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

type Props = {
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageSeoInput) => Promise<{ ok: boolean; error?: string }>;
};

export function PackageSeoForm({ pkg, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageSeoInput>({
    resolver: zodResolver(updatePackageSeoSchema),
    defaultValues: {
      seoTitle: pkg.seoTitle ?? "",
      seoTitleFr: pkg.seoTitleFr ?? "",
      seoDescription: pkg.seoDescription ?? "",
      seoDescriptionFr: pkg.seoDescriptionFr ?? "",
    },
  });

  const seoTitle = form.watch("seoTitle") ?? "";
  const seoDesc = form.watch("seoDescription") ?? "";
  const seoTitleFr = form.watch("seoTitleFr") ?? "";
  const seoDescFr = form.watch("seoDescriptionFr") ?? "";

  function handleSubmit(values: UpdatePackageSeoInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("SEO settings saved.");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="seoTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Title (Arabic)</FormLabel>
                <FormControl>
                  <Input
                    placeholder={pkg.name}
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  {seoTitle.length}/60 characters — shown in search engine results.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="seoTitleFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Title (French)</FormLabel>
                <FormControl>
                  <Input
                    placeholder={pkg.nameFr ?? pkg.name}
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  {seoTitleFr.length}/60 characters — optional, falls back to Arabic.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="seoDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Description (Arabic)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={pkg.shortDescription ?? pkg.description ?? ""}
                    className="min-h-[100px]"
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  {seoDesc.length}/160 characters — shown below the title in search results.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="seoDescriptionFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Description (French)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={pkg.shortDescriptionFr ?? pkg.descriptionFr ?? ""}
                    className="min-h-[100px]"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  {seoDescFr.length}/160 characters — optional, falls back to Arabic.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Live preview */}
        {(seoTitle || seoDesc) && (
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
              Preview (Arabic)
            </p>
            <p className="text-[#1a0dab] text-base font-medium">
              {seoTitle || pkg.name}
            </p>
            <p className="text-muted-foreground text-sm">
              {seoDesc || pkg.shortDescription || pkg.description || "No description."}
            </p>
          </div>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save SEO"}
        </Button>
      </form>
    </Form>
  );
}
