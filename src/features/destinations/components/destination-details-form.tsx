"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  destinationDetailsSchema,
  type DestinationDetailsInput,
  type CreateDestinationWithMediaInput,
} from "@/features/destinations/schemas/destination.schema";
import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";
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

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  destination?: DestinationDetail;
  onSubmit: (
    values: DestinationDetailsInput | CreateDestinationWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { destinationId: string } }>;
};

export function DestinationDetailsForm({ mode, tenantSlug, destination, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<DestinationDetailsInput>({
    resolver: zodResolver(destinationDetailsSchema),
    defaultValues: {
      name: destination?.name ?? "",
      nameFr: destination?.nameFr ?? "",
      slug: destination?.slug ?? "",
      featured: destination?.featured ?? false,
      country: destination?.country ?? "",
      countryFr: destination?.countryFr ?? "",
      region: destination?.region ?? "",
      regionFr: destination?.regionFr ?? "",
      city: destination?.city ?? "",
      cityFr: destination?.cityFr ?? "",
      description: destination?.description ?? "",
      descriptionFr: destination?.descriptionFr ?? "",
      popularAttractions: destination?.popularAttractions ?? [],
      popularAttractionsFr: destination?.popularAttractionsFr ?? [],
    },
  });

  const watchedName = form.watch("name");
  const slugIsPristine = !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (slugIsPristine && watchedName !== destination?.name) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, slugIsPristine, destination?.name, form]);

  function handleSubmit(values: DestinationDetailsInput) {
    startTransition(async () => {
      const payload: DestinationDetailsInput | CreateDestinationWithMediaInput =
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
        toast.success("Destination created.");
        router.push(`/${tenantSlug}/admin/destinations/${result.data.destinationId}/edit`);
      } else {
        toast.success("Saved.");
        router.refresh();
      }
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
                <FormLabel>Destination Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="مراكش" dir="rtl" {...field} />
                </FormControl>
                <FormDescription>Arabic is the primary language shown to visitors.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Destination Name (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Marrakech" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  Shown when a visitor switches to French. Leave blank to show the Arabic name instead.
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
                  <Input placeholder="marrakech" {...field} />
                </FormControl>
                <FormDescription>
                  /{tenantSlug}/destinations/{field.value || "your-destination"}
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
                  <FormLabel className="cursor-pointer">Featured destination</FormLabel>
                  <FormDescription>
                    Featured destinations are highlighted on the agency storefront.
                  </FormDescription>
                </div>
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
                  <Input placeholder="المغرب" dir="rtl" {...field} />
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
                  <Input placeholder="Maroc" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="مراكش آسفي" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regionFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Marrakech-Safi" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
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
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
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
                  <Textarea className="min-h-[140px]" dir="rtl" {...field} value={field.value ?? ""} />
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
                  <Textarea className="min-h-[140px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 sm:col-span-2 sm:grid-cols-2">
            <FormItem>
              <FormLabel>Popular Attractions (Arabic)</FormLabel>
              <Controller
                control={form.control}
                name="popularAttractions"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="جامع الفنا، قصر الباهية…"
                    disabled={isPending}
                  />
                )}
              />
            </FormItem>

            <FormItem>
              <FormLabel>Popular Attractions (French)</FormLabel>
              <Controller
                control={form.control}
                name="popularAttractionsFr"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Jemaa el-Fnaa, Bahia Palace…"
                    disabled={isPending}
                  />
                )}
              />
              <FormDescription>Optional — falls back to the Arabic list if left empty.</FormDescription>
            </FormItem>
          </div>
        </div>

        {mode === "create" && (
          <>
            <Separator />
            <div className="space-y-8">
              <CoverImageUploader
                {...coverUploaderProps}
                title="Hero Image"
                description="Large banner image for the destination. Recommended: 1600×600px."
                aspectClassName="aspect-[1600/600]"
              />
              <GalleryUploader {...galleryUploaderProps} />
            </div>
          </>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Destination" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
