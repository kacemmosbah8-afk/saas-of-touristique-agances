"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  updatePackageDetailsSchema,
  type UpdatePackageDetailsInput,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Props = {
  tenantSlug: string;
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageDetailsInput) => Promise<{ ok: boolean; error?: string }>;
};

export function PackageDetailsForm({ tenantSlug, pkg, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageDetailsInput>({
    resolver: zodResolver(updatePackageDetailsSchema),
    defaultValues: {
      name: pkg.name,
      slug: pkg.slug,
      shortDescription: pkg.shortDescription ?? "",
      description: pkg.description ?? "",
      destination: pkg.destination ?? "",
      country: pkg.country ?? "",
      duration: pkg.duration ?? undefined,
      durationNights: pkg.durationNights ?? undefined,
      category: pkg.category ?? "",
      difficulty: pkg.difficulty ?? undefined,
      featured: pkg.featured,
    },
  });

  const watchedName = form.watch("name");
  // Only auto-sync slug if it hasn't been manually changed from the original
  const slugIsPristine = !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (slugIsPristine && watchedName !== pkg.name) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, slugIsPristine, pkg.name, form]);

  function handleSubmit(values: UpdatePackageDetailsInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Details saved.");
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
                <FormLabel>Package Name</FormLabel>
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
            name="shortDescription"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Short Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="A one-line summary shown in listings…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Max 300 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Full Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the package in detail…"
                    className="min-h-[140px]"
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
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Marrakech"
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
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Morocco"
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
            name="durationNights"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (nights)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    placeholder="6"
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Adventure, Cultural, Beach…"
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
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) =>
                    field.onChange(
                      v === "" ? undefined : v as UpdatePackageDetailsInput["difficulty"],
                    )
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="CHALLENGING">Challenging</SelectItem>
                    <SelectItem value="EXTREME">Extreme</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 sm:col-span-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4 rounded border-gray-300"
                  />
                </FormControl>
                <div>
                  <FormLabel className="cursor-pointer">Featured package</FormLabel>
                  <FormDescription>
                    Featured packages are highlighted on the agency storefront.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
