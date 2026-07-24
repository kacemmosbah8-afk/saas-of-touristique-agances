"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  hotelFormSchema,
  HOTEL_CATEGORIES,
  type HotelFormInput,
  type CreateHotelWithMediaInput,
} from "@/features/hotels/schemas/hotel.schema";
import { HOTEL_CATEGORY_LABELS } from "@/features/hotels/lib/labels";
import type { HotelDetail } from "@/features/hotels/queries/get-hotel.query";
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

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  hotel?: HotelDetail;
  onSubmit: (
    values: HotelFormInput | CreateHotelWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { hotelId: string } }>;
};

function numberField(value: number | null | undefined) {
  return value ?? undefined;
}

export function HotelForm({ mode, tenantSlug, hotel, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<HotelFormInput>({
    resolver: zodResolver(hotelFormSchema),
    defaultValues: {
      name: hotel?.name ?? "",
      nameFr: hotel?.nameFr ?? "",
      slug: hotel?.slug ?? "",
      featured: hotel?.featured ?? false,
      category: hotel?.category ?? "STANDARD",
      stars: numberField(hotel?.stars),
      country: hotel?.country ?? "",
      countryFr: hotel?.countryFr ?? "",
      city: hotel?.city ?? "",
      cityFr: hotel?.cityFr ?? "",
      address: hotel?.address ?? "",
      addressFr: hotel?.addressFr ?? "",
      latitude: numberField(hotel?.latitude),
      longitude: numberField(hotel?.longitude),
      description: hotel?.description ?? "",
      descriptionFr: hotel?.descriptionFr ?? "",
      amenities: hotel?.amenities ?? [],
      amenitiesFr: hotel?.amenitiesFr ?? [],
      contactName: hotel?.contactName ?? "",
      contactEmail: hotel?.contactEmail ?? "",
      contactPhone: hotel?.contactPhone ?? "",
      website: hotel?.website ?? "",
      internalNotes: hotel?.internalNotes ?? "",
    },
  });

  const watchedName = form.watch("name");
  const slugIsPristine = !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (slugIsPristine && watchedName !== hotel?.name) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, slugIsPristine, hotel?.name, form]);

  function handleSubmit(values: HotelFormInput) {
    startTransition(async () => {
      const payload: HotelFormInput | CreateHotelWithMediaInput =
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
        toast.success("Hotel created.");
        router.push(`/${tenantSlug}/admin/hotels/${result.data.hotelId}/edit`);
      } else {
        toast.success("Hotel saved.");
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
                <FormLabel>Hotel Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="رياض المنزل الذهبي" dir="rtl" {...field} />
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
                <FormLabel>Hotel Name (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Riad La Maison Dorée" {...field} value={field.value ?? ""} />
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
                  <Input placeholder="riad-la-maison-doree" {...field} />
                </FormControl>
                <FormDescription>
                  /{tenantSlug}/hotels/{field.value || "your-hotel"}
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
                  <FormLabel className="cursor-pointer">Featured hotel</FormLabel>
                  <FormDescription>
                    Featured hotels are highlighted on the agency storefront.
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
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOTEL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {HOTEL_CATEGORY_LABELS[c]}
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
            name="stars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stars</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    placeholder="5"
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
                  <Input placeholder="مراكش" dir="rtl" {...field} value={field.value ?? ""} />
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
                  <Input placeholder="Marrakech" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
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
                  <Input placeholder="المغرب" dir="rtl" {...field} value={field.value ?? ""} />
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
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Address (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="درب جديد، المدينة القديمة" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="addressFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Address (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Derb Jdid, Medina" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="31.6295"
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
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-7.9811"
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
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description (Arabic)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="صف الفندق…"
                    className="min-h-[120px]"
                    dir="rtl"
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
            name="descriptionFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description (French)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez l'hôtel…"
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem className="sm:col-span-2">
            <FormLabel>Amenities (Arabic)</FormLabel>
            <Controller
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="مسبح، منتجع صحي، واي فاي مجاني…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormItem className="sm:col-span-2">
            <FormLabel>Amenities (French)</FormLabel>
            <Controller
              control={form.control}
              name="amenitiesFr"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Piscine, Spa, Wi-Fi gratuit…"
                  disabled={isPending}
                />
              )}
            />
            <FormDescription>Optional — falls back to the Arabic list if left blank.</FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="reservations@hotel.com" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internalNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Internal Notes{" "}
                  <span className="text-muted-foreground font-normal">(not shown to customers)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Negotiated rates, key contacts…"
                    className="min-h-[80px]"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          {isPending ? "Saving…" : mode === "create" ? "Create Hotel" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
