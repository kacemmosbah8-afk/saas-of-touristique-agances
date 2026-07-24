"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  flightFormSchema,
  CABIN_CLASSES,
  type FlightFormInput,
  type CreateFlightWithMediaInput,
} from "@/features/flights/schemas/flight.schema";
import type { FlightDetail } from "@/features/flights/queries/get-flight.query";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { CoverImageUploader } from "@/shared/components/media/cover-image-uploader";
import { GalleryUploader } from "@/shared/components/media/gallery-uploader";
import { usePendingCoverImage, usePendingGallery } from "@/shared/lib/storage/use-pending-media";
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

const NO_CABIN = "__none__";

const CABIN_CLASS_LABELS: Record<(typeof CABIN_CLASSES)[number], string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Business",
  FIRST: "First",
};

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
  flight?: FlightDetail;
  onSubmit: (
    values: FlightFormInput | CreateFlightWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { flightId: string } }>;
};

export function FlightForm({ mode, tenantSlug, flight, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<FlightFormInput>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: {
      name: flight?.name ?? "",
      nameFr: flight?.nameFr ?? "",
      slug: flight?.slug ?? "",
      featured: flight?.featured ?? false,
      shortDescription: flight?.shortDescription ?? "",
      shortDescriptionFr: flight?.shortDescriptionFr ?? "",
      description: flight?.description ?? "",
      descriptionFr: flight?.descriptionFr ?? "",
      airline: flight?.airline ?? "",
      flightNumber: flight?.flightNumber ?? "",
      departureCity: flight?.departureCity ?? "",
      departureCityFr: flight?.departureCityFr ?? "",
      departureAirport: flight?.departureAirport ?? "",
      departureAirportFr: flight?.departureAirportFr ?? "",
      departureCountry: flight?.departureCountry ?? "",
      departureCountryFr: flight?.departureCountryFr ?? "",
      arrivalCity: flight?.arrivalCity ?? "",
      arrivalCityFr: flight?.arrivalCityFr ?? "",
      arrivalAirport: flight?.arrivalAirport ?? "",
      arrivalAirportFr: flight?.arrivalAirportFr ?? "",
      arrivalCountry: flight?.arrivalCountry ?? "",
      arrivalCountryFr: flight?.arrivalCountryFr ?? "",
      departureTime: flight?.departureTime ?? "",
      arrivalTime: flight?.arrivalTime ?? "",
      durationMinutes: flight?.durationMinutes ?? undefined,
      stops: flight?.stops ?? 0,
      cabinClass: (flight?.cabinClass as FlightFormInput["cabinClass"]) ?? "",
      basePrice: flight?.basePrice ?? undefined,
      currency: flight?.currency ?? "USD",
    },
  });

  const watchedName = form.watch("name");
  const slugIsPristine = !form.formState.dirtyFields.slug;
  useEffect(() => {
    if (slugIsPristine && watchedName !== flight?.name) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, slugIsPristine, flight?.name, form]);

  function handleSubmit(values: FlightFormInput) {
    startTransition(async () => {
      const payload: FlightFormInput | CreateFlightWithMediaInput =
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
        toast.success("Flight created.");
        router.push(`/${tenantSlug}/admin/flights/${result.data.flightId}/edit`);
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
                <FormLabel>Flight Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="الدار البيضاء → باريس مباشرة" dir="rtl" {...field} />
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
                <FormLabel>Flight Name (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Casablanca → Paris Direct" {...field} value={field.value ?? ""} />
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
                  <Input placeholder="casablanca-paris-direct" {...field} />
                </FormControl>
                <FormDescription>
                  /{tenantSlug}/flights/{field.value || "your-flight"}
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
                  <FormLabel className="cursor-pointer">Featured flight</FormLabel>
                  <FormDescription>
                    Featured flights are highlighted on the agency storefront.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortDescription"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Short Description (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="ملخص سريع يظهر في بطاقات القوائم" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortDescriptionFr"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Short Description (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Un résumé rapide affiché sur les cartes" {...field} value={field.value ?? ""} />
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

          <FormField
            control={form.control}
            name="airline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Airline</FormLabel>
                <FormControl>
                  <Input placeholder="Royal Air Maroc" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="flightNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flight Number</FormLabel>
                <FormControl>
                  <Input placeholder="AT800" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure City (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="الدار البيضاء" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureCityFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure City (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Casablanca" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureAirport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Airport (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="محمد الخامس (CMN)" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureAirportFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Airport (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Mohammed V (CMN)" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Country (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="المغرب" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureCountryFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure Country (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Maroc" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typical Departure Time</FormLabel>
                <FormControl>
                  <Input placeholder="08:00" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival City (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="باريس" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalCityFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival City (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalAirport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Airport (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="شارل ديغول (CDG)" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalAirportFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Airport (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Charles de Gaulle (CDG)" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Country (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="فرنسا" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalCountryFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival Country (French)</FormLabel>
                <FormControl>
                  <Input placeholder="France" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to Arabic.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrivalTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typical Arrival Time</FormLabel>
                <FormControl>
                  <Input placeholder="11:30" {...field} value={field.value ?? ""} />
                </FormControl>
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
                    placeholder="210"
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
            name="stops"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stops</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    {...field}
                    value={field.value ?? 0}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormDescription>0 = direct / nonstop</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cabinClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cabin Class</FormLabel>
                <Select
                  value={field.value ? field.value : NO_CABIN}
                  onValueChange={(v) => field.onChange(v === NO_CABIN ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_CABIN}>Not set</SelectItem>
                    {CABIN_CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CABIN_CLASS_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="350"
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
          {isPending ? "Saving…" : mode === "create" ? "Create Flight" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
