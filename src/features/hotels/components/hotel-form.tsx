"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm, Controller, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Info,
  MapPin,
  Star,
  Phone,
  Image as ImageIcon,
  Languages,
  ListChecks,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary, type AdminDictionary } from "@/shared/i18n/admin-dictionary";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function numberField(value: number | null | undefined) {
  return value ?? undefined;
}

/**
 * Every translated field pair (AR required, FR optional) shares this
 * toggle instead of showing both languages stacked at once — AR is the
 * default tab since it's the only side that can carry a required field
 * (e.g. `name`), so a validation error is never hidden behind FR.
 */
function LanguageFields({ ar, fr }: { ar: ReactNode; fr: ReactNode }) {
  return (
    <Tabs defaultValue="ar">
      <TabsList className="h-8 w-fit">
        <TabsTrigger value="ar" className="px-3 text-xs">
          AR
        </TabsTrigger>
        <TabsTrigger value="fr" className="px-3 text-xs">
          FR
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ar" className="mt-4 space-y-4">
        {ar}
      </TabsContent>
      <TabsContent value="fr" className="mt-4 space-y-4">
        {fr}
      </TabsContent>
    </Tabs>
  );
}

/** Small inline hint (with a language icon) marking a field as an optional
 * translation that falls back to the Arabic value when left empty. */
function FallbackHint({ children }: { children: ReactNode }) {
  return (
    <FormDescription className="flex items-center gap-1.5">
      <Languages className="text-muted-foreground/70 size-3.5 shrink-0" />
      {children}
    </FormDescription>
  );
}

/** Icon + title + one-line description used at the top of every section card. */
function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
          <Icon className="size-4" />
        </span>
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

/** One label/value line inside a Review card. */
function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/** Read-only summary card for the Review step — icon/title match the live
 * section, plus a jump-back "Edit" action instead of a submission button. */
function ReviewCard({
  icon: Icon,
  title,
  editLabel,
  onEdit,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        <CardAction>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            {editLabel}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">{children}</dl>
      </CardContent>
    </Card>
  );
}

const WIZARD_STEPS = [
  { key: "general", icon: Info },
  { key: "location", icon: MapPin },
  { key: "details", icon: Star },
  { key: "contact", icon: Phone },
  { key: "media", icon: ImageIcon },
  { key: "review", icon: ListChecks },
] as const;

type StepKey = (typeof WIZARD_STEPS)[number]["key"];

/** Fields validated (via `form.trigger`) before a step's "Next" is allowed
 * to advance. Media/Review have no react-hook-form fields of their own. */
const STEP_VALIDATION_FIELDS: Partial<Record<StepKey, Path<HotelFormInput>[]>> = {
  general: ["name", "nameFr", "slug", "featured", "description", "descriptionFr"],
  location: [
    "city",
    "cityFr",
    "country",
    "countryFr",
    "address",
    "addressFr",
    "latitude",
    "longitude",
  ],
  details: ["category", "stars", "amenities", "amenitiesFr"],
  contact: ["contactName", "contactEmail", "contactPhone", "website", "internalNotes"],
};

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  hotel?: HotelDetail;
  onSubmit: (
    values: HotelFormInput | CreateHotelWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { hotelId: string } }>;
  locale: Locale;
};

// --- Step components — each is a real function component so React only
// evaluates the JSX for the step that's actually rendered (create-mode
// wizard shows one at a time; edit-mode Tabs unmounts inactive content). ---

type HotelDict = AdminDictionary["hotels"]["form"];
type HotelSections = HotelDict["sections"];
type CommonDict = AdminDictionary["common"];
type NumericHandler = (
  onChange: (v: number | undefined) => void,
) => (e: React.ChangeEvent<HTMLInputElement>) => void;

function GeneralStep({
  form,
  dict,
  sections,
  common,
  tenantSlug,
  slugExpanded,
  setSlugExpanded,
}: {
  form: UseFormReturn<HotelFormInput>;
  dict: HotelDict;
  sections: HotelSections;
  common: CommonDict;
  tenantSlug: string;
  slugExpanded: boolean;
  setSlugExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Card>
      <SectionHeading icon={Info} title={sections.general} description={sections.generalHint} />
      <CardContent className="space-y-6">
        <LanguageFields
          ar={
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.nameAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="رياض المنزل الذهبي" dir="rtl" {...field} />
                  </FormControl>
                  <FormDescription>{dict.arabicPrimaryNote}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          }
          fr={
            <FormField
              control={form.control}
              name="nameFr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.nameFr}</FormLabel>
                  <FormControl>
                    <Input placeholder="Riad La Maison Dorée" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FallbackHint>{dict.frenchFallbackNote}</FallbackHint>
                  <FormMessage />
                </FormItem>
              )}
            />
          }
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{sections.description}</p>
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {dict.recommended}
            </span>
          </div>
          <LanguageFields
            ar={
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.descriptionAr}</FormLabel>
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
            }
            fr={
              <FormField
                control={form.control}
                name="descriptionFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.descriptionFr}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez l'hôtel…"
                        className="min-h-[120px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
            }
          />
        </div>

        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-3">
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

        {/* Auto-generated from the name; collapsed to a low-emphasis
            preview since it rarely needs manual attention. */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{dict.urlSlug}</p>
              <p className="truncate text-sm">
                /{tenantSlug}/hotels/{form.watch("slug") || "…"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSlugExpanded((v) => !v)}>
              {common.edit}
            </Button>
          </div>
          {slugExpanded && (
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="mt-3">
                  <FormControl>
                    <Input placeholder="riad-la-maison-doree" {...field} />
                  </FormControl>
                  <FormDescription>{dict.urlSlugCollapsedHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationStep({
  form,
  dict,
  sections,
  numeric,
}: {
  form: UseFormReturn<HotelFormInput>;
  dict: HotelDict;
  sections: HotelSections;
  numeric: NumericHandler;
}) {
  return (
    <Card>
      <SectionHeading icon={MapPin} title={sections.location} description={sections.locationHint} />
      <CardContent className="space-y-6">
        <LanguageFields
          ar={
            <>
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.cityAr}</FormLabel>
                    <FormControl>
                      <Input placeholder="مراكش" dir="rtl" {...field} value={field.value ?? ""} />
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
                      <Input placeholder="المغرب" dir="rtl" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.addressAr}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="درب جديد، المدينة القديمة"
                        dir="rtl"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          }
          fr={
            <>
              <FormField
                control={form.control}
                name="cityFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.cityFr}</FormLabel>
                    <FormControl>
                      <Input placeholder="Marrakech" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.countryFr}</FormLabel>
                    <FormControl>
                      <Input placeholder="Maroc" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.addressFr}</FormLabel>
                    <FormControl>
                      <Input placeholder="Derb Jdid, Medina" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.latitude}</FormLabel>
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
                <FormLabel>{dict.longitude}</FormLabel>
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
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsStep({
  form,
  dict,
  sections,
  numeric,
  isPending,
  locale,
}: {
  form: UseFormReturn<HotelFormInput>;
  dict: HotelDict;
  sections: HotelSections;
  numeric: NumericHandler;
  isPending: boolean;
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={Star} title={sections.details} description={sections.detailsHint} />
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.category}</FormLabel>
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
                <FormLabel>{dict.stars}</FormLabel>
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
        </div>

        <LanguageFields
          ar={
            <FormItem>
              <FormLabel>{dict.amenitiesAr}</FormLabel>
              <Controller
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="مسبح، منتجع صحي، واي فاي مجاني…"
                    disabled={isPending}
                    locale={locale}
                  />
                )}
              />
            </FormItem>
          }
          fr={
            <FormItem>
              <FormLabel>{dict.amenitiesFr}</FormLabel>
              <Controller
                control={form.control}
                name="amenitiesFr"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Piscine, Spa, Wi-Fi gratuit…"
                    disabled={isPending}
                    locale={locale}
                  />
                )}
              />
              <FallbackHint>{dict.optionalFallsBackListAr}</FallbackHint>
            </FormItem>
          }
        />
      </CardContent>
    </Card>
  );
}

function ContactStep({
  form,
  dict,
  sections,
}: {
  form: UseFormReturn<HotelFormInput>;
  dict: HotelDict;
  sections: HotelSections;
}) {
  return (
    <Card>
      <SectionHeading icon={Phone} title={sections.contact} description={sections.contactHint} />
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contactName}</FormLabel>
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
                <FormLabel>{dict.contactEmail}</FormLabel>
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
                <FormLabel>{dict.contactPhone}</FormLabel>
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
                <FormLabel>{dict.website}</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="internalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {dict.internalNotes}{" "}
                <span className="text-muted-foreground font-normal">({dict.notShownToCustomers})</span>
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
      </CardContent>
    </Card>
  );
}

function MediaStep({
  sections,
  coverUploaderProps,
  galleryUploaderProps,
  locale,
}: {
  sections: HotelSections;
  coverUploaderProps: ReturnType<typeof usePendingCoverImage>["coverUploaderProps"];
  galleryUploaderProps: ReturnType<typeof usePendingGallery>["galleryUploaderProps"];
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={ImageIcon} title={sections.media} description={sections.mediaHint} />
      <CardContent className="space-y-8">
        <CoverImageUploader {...coverUploaderProps} locale={locale} />
        <GalleryUploader {...galleryUploaderProps} locale={locale} />
      </CardContent>
    </Card>
  );
}

// --- Review (wizard only) — read-only summary of every step, each with a
// jump-back "Edit" action; no submission control lives in any card. Calls
// `form.getValues()` internally so that work only happens when Review is
// actually the active step. ---
function ReviewStep({
  form,
  dict,
  sections,
  common,
  goToStep,
  stepIndexOf,
  cover,
  galleryImages,
}: {
  form: UseFormReturn<HotelFormInput>;
  dict: HotelDict;
  sections: HotelSections;
  common: CommonDict;
  goToStep: (index: number) => void;
  stepIndexOf: (key: StepKey) => number;
  cover: ReturnType<typeof usePendingCoverImage>["cover"];
  galleryImages: ReturnType<typeof usePendingGallery>["images"];
}) {
  const values = form.getValues();
  const place = (city?: string, country?: string, address?: string) =>
    [city, country, address].filter(Boolean).join(" · ") || dict.notSet;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{sections.reviewHint}</p>

      <ReviewCard
        icon={Info}
        title={sections.general}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("general"))}
      >
        <ReviewRow label={dict.nameAr} value={values.name || dict.notSet} />
        <ReviewRow label={dict.nameFr} value={values.nameFr || dict.notSet} />
        <ReviewRow label={dict.urlSlug} value={values.slug || dict.notSet} />
        {values.featured ? <ReviewRow label={dict.featured} value={dict.featured} /> : null}
      </ReviewCard>

      <ReviewCard
        icon={MapPin}
        title={sections.location}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("location"))}
      >
        <ReviewRow label={sections.location} value={place(values.city, values.country, values.address)} />
        {(values.latitude || values.longitude) && (
          <ReviewRow
            label={`${dict.latitude} / ${dict.longitude}`}
            value={`${values.latitude ?? dict.notSet}, ${values.longitude ?? dict.notSet}`}
          />
        )}
      </ReviewCard>

      <ReviewCard
        icon={Star}
        title={sections.details}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("details"))}
      >
        <ReviewRow label={dict.category} value={HOTEL_CATEGORY_LABELS[values.category]} />
        <ReviewRow label={dict.stars} value={values.stars ? values.stars : dict.notSet} />
        <ReviewRow
          label={dict.amenitiesAr}
          value={(values.amenities?.length ?? 0) > 0 ? values.amenities!.join(", ") : dict.notSet}
        />
      </ReviewCard>

      <ReviewCard
        icon={Phone}
        title={sections.contact}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("contact"))}
      >
        <ReviewRow label={dict.contactName} value={values.contactName || dict.notSet} />
        <ReviewRow label={dict.contactEmail} value={values.contactEmail || dict.notSet} />
        <ReviewRow label={dict.contactPhone} value={values.contactPhone || dict.notSet} />
        <ReviewRow label={dict.website} value={values.website || dict.notSet} />
      </ReviewCard>

      <ReviewCard
        icon={ImageIcon}
        title={sections.media}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("media"))}
      >
        <div className="flex items-center gap-4 py-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob/preview URL, not an optimizable remote asset
            <img src={cover.url} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
          ) : (
            <div className="text-muted-foreground bg-muted flex size-16 shrink-0 items-center justify-center rounded-md border">
              <ImageIcon className="size-5" />
            </div>
          )}
          <div className="text-sm">
            <p className="font-medium">{cover ? dict.reviewCoverImage : dict.reviewNoMedia}</p>
            {galleryImages.length > 0 && (
              <p className="text-muted-foreground">{dict.reviewGalleryCount(galleryImages.length)}</p>
            )}
          </div>
        </div>
      </ReviewCard>
    </div>
  );
}

export function HotelForm({ mode, tenantSlug, hotel, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).hotels.form;
  const sections = dict.sections;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Wizard-only (mode === "create"); unused, harmless state in edit mode.
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  // The URL slug is auto-generated from the name (see the effect below) and
  // rarely needs a human's attention, so it stays collapsed to a small,
  // low-emphasis preview by default rather than competing with Description
  // for space as a full field.
  const [slugExpanded, setSlugExpanded] = useState(false);
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

  // Auto-generate the slug from the name while the user hasn't touched the
  // slug field yet. Subscribing via `form.watch(callback)` (rather than
  // reading `form.watch("name")`'s return value) never triggers a re-render
  // of this component — only the effect callback runs on each change.
  useEffect(() => {
    const subscription = form.watch((values, { name: changedField }) => {
      if (
        changedField === "name" &&
        !form.formState.dirtyFields.slug &&
        values.name !== hotel?.name
      ) {
        form.setValue("slug", slugify(values.name ?? ""));
      }
    });
    return () => subscription.unsubscribe();
  }, [hotel?.name, form]);

  function submitHotel(values: HotelFormInput) {
    if (mode === "create" && cover == null && galleryImages.length === 0) {
      toast.error(dict.pictureRequired);
      return;
    }
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
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/hotels/${result.data.hotelId}/edit`);
      } else {
        toast.success(dict.saved);
        router.refresh();
      }
    });
  }

  const numeric: NumericHandler = (onChange) => (e) =>
    onChange(e.target.value === "" ? undefined : Number(e.target.value));

  const stepIndexOf = (key: StepKey) => WIZARD_STEPS.findIndex((s) => s.key === key);

  async function goToNextStep() {
    const key = WIZARD_STEPS[stepIndex].key;
    const fields = STEP_VALIDATION_FIELDS[key];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    if (key === "media" && cover == null && galleryImages.length === 0) {
      toast.error(dict.pictureRequired);
      return;
    }
    const next = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    setStepIndex(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  function goToPreviousStep() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function goToStep(index: number) {
    if (index <= maxStepReached) setStepIndex(index);
  }

  /** Safety net for the final submit: if full-schema validation fails
   * (e.g. the user unlocked Review, then jumped back and broke an earlier
   * step without re-running its "Next" check), surface it instead of
   * failing silently — jump to the first step holding an error. */
  function goToFirstErrorStep() {
    const errorFields = Object.keys(form.formState.errors);
    if (errorFields.length === 0) return;
    const step = WIZARD_STEPS.find((s) =>
      STEP_VALIDATION_FIELDS[s.key]?.some((f) => errorFields.includes(f)),
    );
    if (!step) return;
    const index = stepIndexOf(step.key);
    setStepIndex(index);
    setMaxStepReached((m) => Math.max(m, index));
  }

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const currentStepKey = WIZARD_STEPS[stepIndex].key;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          submitHotel,
          mode === "create"
            ? () => {
                toast.error(dict.fixErrorsBeforeSubmitting);
                goToFirstErrorStep();
              }
            : undefined,
        )}
        className="pb-24"
      >
        {mode === "edit" ? (
          <Tabs defaultValue="general">
            <div className="overflow-x-auto">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="gap-1.5">
                  <Info className="size-4" />
                  {sections.general}
                </TabsTrigger>
                <TabsTrigger value="location" className="gap-1.5">
                  <MapPin className="size-4" />
                  {sections.location}
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-1.5">
                  <Star className="size-4" />
                  {sections.details}
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-1.5">
                  <Phone className="size-4" />
                  {sections.contact}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="mt-6">
              <GeneralStep
                form={form}
                dict={dict}
                sections={sections}
                common={common}
                tenantSlug={tenantSlug}
                slugExpanded={slugExpanded}
                setSlugExpanded={setSlugExpanded}
              />
            </TabsContent>
            <TabsContent value="location" className="mt-6">
              <LocationStep form={form} dict={dict} sections={sections} numeric={numeric} />
            </TabsContent>
            <TabsContent value="details" className="mt-6">
              <DetailsStep
                form={form}
                dict={dict}
                sections={sections}
                numeric={numeric}
                isPending={isPending}
                locale={locale}
              />
            </TabsContent>
            <TabsContent value="contact" className="mt-6">
              <ContactStep form={form} dict={dict} sections={sections} />
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            {/* Progress indicator */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  {dict.stepIndicator(stepIndex + 1, WIZARD_STEPS.length)}
                </p>
                <p className="text-sm font-medium">{sections[currentStepKey]}</p>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${((stepIndex + 1) / WIZARD_STEPS.length) * 100}%` }}
                />
              </div>
              <ol className="flex items-center overflow-x-auto pb-1">
                {WIZARD_STEPS.map((step, i) => {
                  const isDone = i < stepIndex;
                  const isCurrent = i === stepIndex;
                  const isUnlocked = i <= maxStepReached;
                  const StepIcon = step.icon;
                  return (
                    <li key={step.key} className="flex items-center">
                      <button
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => goToStep(i)}
                        aria-label={sections[step.key]}
                        aria-current={isCurrent ? "step" : undefined}
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                          isCurrent && "border-primary bg-primary text-primary-foreground",
                          isDone && !isCurrent && "border-primary/40 bg-primary/10 text-primary",
                          !isDone && !isCurrent && "border-border text-muted-foreground",
                          isUnlocked && !isCurrent && "cursor-pointer hover:border-primary/60",
                          !isUnlocked && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {isDone ? <Check className="size-4" /> : <StepIcon className="size-4" />}
                      </button>
                      {i < WIZARD_STEPS.length - 1 && (
                        <span
                          className={cn(
                            "mx-1 h-px w-4 shrink-0 sm:w-8",
                            isDone ? "bg-primary/40" : "bg-border",
                          )}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {currentStepKey === "general" && (
              <GeneralStep
                form={form}
                dict={dict}
                sections={sections}
                common={common}
                tenantSlug={tenantSlug}
                slugExpanded={slugExpanded}
                setSlugExpanded={setSlugExpanded}
              />
            )}
            {currentStepKey === "location" && (
              <LocationStep form={form} dict={dict} sections={sections} numeric={numeric} />
            )}
            {currentStepKey === "details" && (
              <DetailsStep
                form={form}
                dict={dict}
                sections={sections}
                numeric={numeric}
                isPending={isPending}
                locale={locale}
              />
            )}
            {currentStepKey === "contact" && <ContactStep form={form} dict={dict} sections={sections} />}
            {currentStepKey === "media" && (
              <MediaStep
                sections={sections}
                coverUploaderProps={coverUploaderProps}
                galleryUploaderProps={galleryUploaderProps}
                locale={locale}
              />
            )}
            {currentStepKey === "review" && (
              <ReviewStep
                form={form}
                dict={dict}
                sections={sections}
                common={common}
                goToStep={goToStep}
                stepIndexOf={stepIndexOf}
                cover={cover}
                galleryImages={galleryImages}
              />
            )}
          </div>
        )}

        {mode === "edit" ? (
          <div className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-10 mt-6 flex items-center justify-end gap-2 rounded-lg border px-4 py-3 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${tenantSlug}/admin/hotels`)}
              disabled={isPending}
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? dict.saving : dict.saveDetails}
            </Button>
          </div>
        ) : (
          <div className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-2 rounded-lg border px-4 py-3 shadow-sm backdrop-blur">
            <div>
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isPending}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                  {dict.previous}
                </Button>
              )}
            </div>
            <div>
              {isLastStep ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? dict.saving : dict.createHotel}
                </Button>
              ) : (
                <Button type="button" onClick={goToNextStep} disabled={isPending}>
                  {dict.next}
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
              )}
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
