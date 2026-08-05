"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  destinationSeoSchema,
  type DestinationSeoInput,
} from "@/features/destinations/schemas/destination.schema";
import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";
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
  tenantId: string;
  destination: DestinationDetail;
  onSubmit: (values: DestinationSeoInput) => Promise<{ ok: boolean; error?: string }>;
  locale: Locale;
};

export function DestinationSeoForm({ destination, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).destinations.seo;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DestinationSeoInput>({
    resolver: zodResolver(destinationSeoSchema),
    defaultValues: {
      seoTitle: destination.seoTitle ?? "",
      seoDescription: destination.seoDescription ?? "",
    },
  });

  const title = form.watch("seoTitle") ?? "";
  const description = form.watch("seoDescription") ?? "";

  function handleSubmit(values: DestinationSeoInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      toast.success(dict.seoSaved);
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
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>{dict.charsCount(title.length)}</FormDescription>
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
                <Textarea className="min-h-[80px]" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>{dict.charsCount(description.length)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
            {dict.searchPreview}
          </p>
          <p className="text-primary text-base leading-tight">
            {title || destination.name}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {description || dict.addSeoDescriptionPlaceholder}
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : dict.saveSeo}
        </Button>
      </form>
    </Form>
  );
}
