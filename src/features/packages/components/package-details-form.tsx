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
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

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
  locale: Locale;
};

export function PackageDetailsForm({ tenantSlug, pkg, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).packages.detailsForm;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageDetailsInput>({
    resolver: zodResolver(updatePackageDetailsSchema),
    defaultValues: {
      name: pkg.name,
      nameFr: pkg.nameFr ?? "",
      slug: pkg.slug,
      shortDescription: pkg.shortDescription ?? "",
      shortDescriptionFr: pkg.shortDescriptionFr ?? "",
      description: pkg.description ?? "",
      descriptionFr: pkg.descriptionFr ?? "",
      destination: pkg.destination ?? "",
      destinationFr: pkg.destinationFr ?? "",
      country: pkg.country ?? "",
      countryFr: pkg.countryFr ?? "",
      duration: pkg.duration ?? undefined,
      durationNights: pkg.durationNights ?? undefined,
      category: pkg.category ?? "",
      categoryFr: pkg.categoryFr ?? "",
      difficulty: pkg.difficulty ?? undefined,
      featured: pkg.featured,
      internalCost: pkg.internalCost ?? undefined,
      sellingPrice: pkg.sellingPrice ?? undefined,
      currency: pkg.currency ?? "USD",
    },
  });

  const numeric = (onChange: (v: number | undefined) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : Number(e.target.value));

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
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.nameAr}</FormLabel>
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
                <FormLabel>{dict.urlSlug}</FormLabel>
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
                <FormLabel>{dict.shortDescriptionAr}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="A one-line summary shown in listings…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>{dict.maxChars}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{dict.fullDescriptionAr}</FormLabel>
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
                <FormLabel>{dict.destinationAr}</FormLabel>
                <FormControl>
                  <Input placeholder="مراكش" {...field} value={field.value ?? ""} />
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
                <FormLabel>{dict.countryAr}</FormLabel>
                <FormControl>
                  <Input placeholder="المغرب" {...field} value={field.value ?? ""} />
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
                <FormLabel>{dict.durationDays}</FormLabel>
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
                <FormLabel>{dict.durationNights}</FormLabel>
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
                <FormLabel>{dict.categoryAr}</FormLabel>
                <FormControl>
                  <Input placeholder="مغامرة، ثقافية، شاطئية…" {...field} value={field.value ?? ""} />
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
                <FormLabel>{dict.difficulty}</FormLabel>
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
                      <SelectValue placeholder={dict.selectDifficulty} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EASY">{dict.difficultyEasy}</SelectItem>
                    <SelectItem value="MODERATE">{dict.difficultyModerate}</SelectItem>
                    <SelectItem value="CHALLENGING">{dict.difficultyChallenging}</SelectItem>
                    <SelectItem value="EXTREME">{dict.difficultyExtreme}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.internalCost}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="1200"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormDescription>{dict.notShownPublicly}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.fromPrice}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="1850"
                      {...field}
                      value={field.value ?? ""}
                      onChange={numeric(field.onChange)}
                    />
                  </FormControl>
                  <FormDescription>{dict.fromPriceHint}</FormDescription>
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
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 sm:col-span-2">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div>
                  <FormLabel className="cursor-pointer">{dict.featured}</FormLabel>
                  <FormDescription>{dict.featuredDescription}</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? dict.saving : dict.saveDetails}
        </Button>
      </form>
    </Form>
  );
}
