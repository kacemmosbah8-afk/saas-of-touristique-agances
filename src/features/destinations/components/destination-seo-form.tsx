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

type Props = {
  tenantId: string;
  destination: DestinationDetail;
  onSubmit: (values: DestinationSeoInput) => Promise<{ ok: boolean; error?: string }>;
};

export function DestinationSeoForm({ destination, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DestinationSeoInput>({
    resolver: zodResolver(destinationSeoSchema),
    defaultValues: {
      seoTitle: destination.seoTitle ?? "",
      seoTitleFr: destination.seoTitleFr ?? "",
      seoDescription: destination.seoDescription ?? "",
      seoDescriptionFr: destination.seoDescriptionFr ?? "",
    },
  });

  const title = form.watch("seoTitle") ?? "";
  const description = form.watch("seoDescription") ?? "";
  const titleFr = form.watch("seoTitleFr") ?? "";
  const descriptionFr = form.watch("seoDescriptionFr") ?? "";

  function handleSubmit(values: DestinationSeoInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("SEO saved.");
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
                  <Input dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>{title.length}/60 characters</FormDescription>
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
                  <Input placeholder={destination.nameFr ?? destination.name} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  {titleFr.length}/60 characters — optional, falls back to Arabic.
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
                  <Textarea className="min-h-[80px]" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>{description.length}/160 characters</FormDescription>
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
                    className="min-h-[80px]"
                    placeholder={destination.descriptionFr ?? ""}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  {descriptionFr.length}/160 characters — optional, falls back to Arabic.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
            Search Preview
          </p>
          <p className="text-primary text-base leading-tight">
            {title || destination.name}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {description || "Add an SEO description to control this snippet…"}
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save SEO"}
        </Button>
      </form>
    </Form>
  );
}
