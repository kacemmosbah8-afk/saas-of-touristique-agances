"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  activityFormSchema,
  type ActivityFormInput,
  type CreateActivityWithMediaInput,
} from "@/features/activities/schemas/activity.schema";
import type { ActivityDetail } from "@/features/activities/queries/get-activity.query";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { CoverImageUploader } from "@/shared/components/media/cover-image-uploader";
import { GalleryUploader } from "@/shared/components/media/gallery-uploader";
import { usePendingCoverImage, usePendingGallery } from "@/shared/lib/storage/use-pending-media";
import { ListEditor } from "@/shared/components/data/list-editor";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NO_SUPPLIER = "__none__";

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  activity?: ActivityDetail;
  suppliers: SupplierOption[];
  onSubmit: (
    values: ActivityFormInput | CreateActivityWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { activityId: string } }>;
};

export function ActivityCatalogForm({ mode, tenantSlug, activity, suppliers, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: activity?.name ?? "",
      nameFr: activity?.nameFr ?? "",
      slug: activity?.slug ?? "",
      featured: activity?.featured ?? false,
      category: activity?.category ?? "",
      categoryFr: activity?.categoryFr ?? "",
      durationMinutes: activity?.durationMinutes ?? undefined,
      meetingPoint: activity?.meetingPoint ?? "",
      meetingPointFr: activity?.meetingPointFr ?? "",
      description: activity?.description ?? "",
      descriptionFr: activity?.descriptionFr ?? "",
      includedItems: activity?.includedItems ?? [],
      includedItemsFr: activity?.includedItemsFr ?? [],
      excludedItems: activity?.excludedItems ?? [],
      excludedItemsFr: activity?.excludedItemsFr ?? [],
      country: activity?.country ?? "",
      countryFr: activity?.countryFr ?? "",
      city: activity?.city ?? "",
      cityFr: activity?.cityFr ?? "",
      supplierId: activity?.supplierId ?? "",
      internalCost: activity?.internalCost ?? undefined,
      sellingPrice: activity?.sellingPrice ?? undefined,
      currency: activity?.currency ?? "USD",
    },
  });

  const watchedName = form.watch("name");
  const slugIsPristine = !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (slugIsPristine && watchedName !== activity?.name) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, slugIsPristine, activity?.name, form]);

  function handleSubmit(values: ActivityFormInput) {
    startTransition(async () => {
      const payload: ActivityFormInput | CreateActivityWithMediaInput =
        mode === "create"
          ? {
              ...values,
              coverImage: cover,
              images: galleryImages.map(({ fileKey, url }) => ({ fileKey, url })),
            }
          : values;
      const result = await onSubmit(payload);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Activity created.");
        router.push(`/${tenantSlug}/admin/activities/${result.data.activityId}/edit`);
      } else {
        toast.success("Saved.");
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
                <FormLabel>Activity Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="Sunset Desert Safari" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Activity Name (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Safari au coucher du soleil" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
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
                  <Input placeholder="sunset-desert-safari" {...field} />
                </FormControl>
                <FormDescription>
                  /{tenantSlug}/activities/{field.value || "your-activity"}
                </FormDescription>
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
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div>
                  <FormLabel className="cursor-pointer">Featured activity</FormLabel>
                  <FormDescription>
                    Featured activities are highlighted on the agency storefront.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="Adventure, Cultural…" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Aventure, Culturel…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="240"
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
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City (Arabic)</FormLabel>
                <FormControl>
                  <Input dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cityFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City (French)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country (Arabic)</FormLabel>
                <FormControl>
                  <Input dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country (French)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meetingPoint"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Meeting Point (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="Hotel lobby, main gate…" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meetingPointFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Meeting Point (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Hall de l'hôtel, entrée principale…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description (Arabic)</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[120px]" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descriptionFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description (French)</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[120px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Optional — falls back to the Arabic version if left blank.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Included (Arabic)</FormLabel>
            <Controller
              control={form.control}
              name="includedItems"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Transport, guide, meals…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormItem>
            <FormLabel>Included (French)</FormLabel>
            <Controller
              control={form.control}
              name="includedItemsFr"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Transport, guide, repas…"
                  disabled={isPending}
                />
              )}
            />
            <FormDescription>
              Optional — falls back to the Arabic list if left empty.
            </FormDescription>
          </FormItem>

          <FormItem>
            <FormLabel>Excluded (Arabic)</FormLabel>
            <Controller
              control={form.control}
              name="excludedItems"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Tips, personal expenses…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormItem>
            <FormLabel>Excluded (French)</FormLabel>
            <Controller
              control={form.control}
              name="excludedItemsFr"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Pourboires, dépenses personnelles…"
                  disabled={isPending}
                />
              )}
            />
            <FormDescription>
              Optional — falls back to the Arabic list if left empty.
            </FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Supplier</FormLabel>
                <Select
                  value={field.value ? field.value : NO_SUPPLIER}
                  onValueChange={(v) => field.onChange(v === NO_SUPPLIER ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER}>No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
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
                <FormLabel>Internal Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="40"
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
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="75"
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
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input maxLength={3} className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {mode === "create" && (
          <>
            <Separator />
            <div className="space-y-8">
              <CoverImageUploader {...coverUploaderProps} />
              <GalleryUploader {...galleryUploaderProps} />
            </div>
          </>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Activity" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
