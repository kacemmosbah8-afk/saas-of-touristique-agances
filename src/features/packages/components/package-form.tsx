"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createPackageSchema,
  type CreatePackageInput,
} from "@/features/packages/schemas/package.schema";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type PackageFormValues = CreatePackageInput;

type PackageFormProps = {
  tenantSlug: string;
  defaultValues?: Partial<PackageFormValues>;
  onSubmit: (values: PackageFormValues) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
};

export function PackageForm({
  tenantSlug,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
}: PackageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!defaultValues?.name;

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(createPackageSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      destination: "",
      ...defaultValues,
    },
  });

  // Auto-generate slug from name on create only
  const watchedName = form.watch("name");
  useEffect(() => {
    if (!isEdit && !form.formState.dirtyFields.slug) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, isEdit, form]);

  function handleSubmit(values: PackageFormValues) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(isEdit ? "Package updated." : "Package created.");
      router.push(`/${tenantSlug}/packages`);
      router.refresh();
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
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="7-Day Morocco Desert Tour" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>URL Slug</FormLabel>
                <FormControl>
                  <Input placeholder="morocco-desert-tour-7d" {...field} />
                </FormControl>
                <FormDescription>
                  travelos.com/{tenantSlug}/packages/{field.value || "your-package"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  <Input placeholder="Marrakech, Morocco" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    placeholder="7"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the package highlights, inclusions, and what makes it special…"
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${tenantSlug}/packages`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
