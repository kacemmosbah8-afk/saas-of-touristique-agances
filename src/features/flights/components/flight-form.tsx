"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Info,
  Route as RouteIcon,
  Clock,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Banknote,
  Image as ImageIcon,
  ListChecks,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
import { FlightStatusBadge } from "@/features/flights/components/flight-status-badge";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getFlightsDict, type FlightsDict } from "@/shared/i18n/admin-dictionary/flights";
import { getCommonDict, type CommonDict } from "@/shared/i18n/admin-dictionary/common";

const NO_CABIN = "__none__";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
  { key: "route", icon: RouteIcon },
  { key: "schedule", icon: Clock },
  { key: "airline", icon: Plane },
  { key: "pricing", icon: Banknote },
  { key: "media", icon: ImageIcon },
  { key: "review", icon: ListChecks },
] as const;

type StepKey = (typeof WIZARD_STEPS)[number]["key"];

/** Fields validated (via `form.trigger`) before a step's "Next" is allowed
 * to advance. Media/Review have no react-hook-form fields of their own. */
const STEP_VALIDATION_FIELDS: Partial<Record<StepKey, Path<FlightFormInput>[]>> = {
  general: ["name", "slug", "featured", "shortDescription", "description"],
  route: [
    "departureCity",
    "departureAirport",
    "departureCountry",
    "arrivalCity",
    "arrivalAirport",
    "arrivalCountry",
  ],
  schedule: ["departureTime", "arrivalTime", "durationMinutes", "stops", "cabinClass"],
  airline: ["airline", "flightNumber"],
  pricing: ["basePrice", "currency"],
};

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  flight?: FlightDetail;
  onSubmit: (
    values: FlightFormInput | CreateFlightWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { flightId: string } }>;
  locale: Locale;
};

// --- Step components — each is a real function component so React only
// evaluates the JSX for the step that's actually rendered (create-mode
// wizard shows one at a time; edit-mode Tabs unmounts inactive content). ---

type FlightDict = FlightsDict["form"];
type FlightSections = FlightDict["sections"];
type CabinClassLabels = Record<(typeof CABIN_CLASSES)[number], string>;
type NumericHandler = (
  onChange: (v: number | undefined) => void,
) => (e: React.ChangeEvent<HTMLInputElement>) => void;

function GeneralStep({
  form,
  dict,
  sections,
  common,
  mode,
  flight,
  locale,
  tenantSlug,
  slugExpanded,
  setSlugExpanded,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
  common: CommonDict;
  mode: "create" | "edit";
  flight?: FlightDetail;
  locale: Locale;
  tenantSlug: string;
  slugExpanded: boolean;
  setSlugExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Card>
      <SectionHeading icon={Info} title={sections.general} description={sections.generalHint} />
      <CardContent className="space-y-6">
        {mode === "edit" && flight ? (
          <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{dict.publicationStatus}</p>
              <p className="text-muted-foreground text-xs">{dict.publicationStatusHint}</p>
            </div>
            <FlightStatusBadge status={flight.status} locale={locale} />
          </div>
        ) : (
          <div className="bg-muted/40 rounded-lg border p-3">
            <p className="text-sm font-medium">{dict.publicationStatus}</p>
            <p className="text-muted-foreground text-xs">{dict.newFlightDraftHint}</p>
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.nameAr}</FormLabel>
              <FormControl>
                <Input placeholder="الدار البيضاء → باريس مباشرة" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{sections.description}</p>
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {dict.recommended}
            </span>
          </div>
          <FormField
            control={form.control}
            name="shortDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.shortDescriptionAr}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.descriptionAr}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[120px]" {...field} value={field.value ?? ""} />
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
                /{tenantSlug}/flights/{form.watch("slug") || "…"}
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
                    <Input placeholder="casablanca-paris-direct" {...field} />
                  </FormControl>
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

function RouteStep({
  form,
  dict,
  sections,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
}) {
  return (
    <>
      <p className="text-muted-foreground text-sm">{sections.routeHint}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
                <PlaneTakeoff className="size-4" />
              </span>
              {sections.departure}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="departureCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.departureCityAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="الدار البيضاء" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departureAirport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.departureAirportAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="محمد الخامس (CMN)" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departureCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.departureCountryAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="المغرب" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
                <PlaneLanding className="size-4" />
              </span>
              {sections.arrival}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="arrivalCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.arrivalCityAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="باريس" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="arrivalAirport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.arrivalAirportAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="شارل ديغول (CDG)" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="arrivalCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.arrivalCountryAr}</FormLabel>
                  <FormControl>
                    <Input placeholder="فرنسا" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ScheduleStep({
  form,
  dict,
  sections,
  numeric,
  cabinClassLabels,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
  numeric: NumericHandler;
  cabinClassLabels: CabinClassLabels;
}) {
  return (
    <Card>
      <SectionHeading icon={Clock} title={sections.schedule} description={sections.scheduleHint} />
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={form.control}
          name="departureTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.departureTime}</FormLabel>
              <FormControl>
                <Input placeholder="08:00" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="arrivalTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.arrivalTime}</FormLabel>
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
              <FormLabel>{dict.durationMinutes}</FormLabel>
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
              <FormLabel>{dict.stops}</FormLabel>
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
              <FormDescription>{dict.stopsHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cabinClass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.cabinClass}</FormLabel>
              <Select
                value={field.value ? field.value : NO_CABIN}
                onValueChange={(v) => field.onChange(v === NO_CABIN ? "" : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.notSet} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_CABIN}>{dict.notSet}</SelectItem>
                  {CABIN_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {cabinClassLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

function AirlineStep({
  form,
  dict,
  sections,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
}) {
  return (
    <Card>
      <SectionHeading icon={Plane} title={sections.airline} description={sections.airlineHint} />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="airline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.airline}</FormLabel>
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
              <FormLabel>{dict.flightNumber}</FormLabel>
              <FormControl>
                <Input placeholder="AT800" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

function PricingStep({
  form,
  dict,
  sections,
  numeric,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
  numeric: NumericHandler;
}) {
  return (
    <Card>
      <SectionHeading icon={Banknote} title={sections.pricing} description={sections.pricingHint} />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="basePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.basePrice}</FormLabel>
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
              <FormLabel>{dict.currency}</FormLabel>
              <FormControl>
                <Input maxLength={3} className="uppercase" {...field} />
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
  mediaError,
  locale,
}: {
  sections: FlightSections;
  coverUploaderProps: ReturnType<typeof usePendingCoverImage>["coverUploaderProps"];
  galleryUploaderProps: ReturnType<typeof usePendingGallery>["galleryUploaderProps"];
  mediaError: string | null;
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={ImageIcon} title={sections.media} description={sections.mediaHint} />
      <CardContent className="space-y-8">
        {mediaError && (
          <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm">
            {mediaError}
          </p>
        )}
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
  cabinClassLabels,
}: {
  form: UseFormReturn<FlightFormInput>;
  dict: FlightDict;
  sections: FlightSections;
  common: CommonDict;
  goToStep: (index: number) => void;
  stepIndexOf: (key: StepKey) => number;
  cover: ReturnType<typeof usePendingCoverImage>["cover"];
  galleryImages: ReturnType<typeof usePendingGallery>["images"];
  cabinClassLabels: CabinClassLabels;
}) {
  const values = form.getValues();
  const place = (city?: string, airport?: string, country?: string) =>
    [city, airport && `(${airport})`, country].filter(Boolean).join(" ") || dict.notSet;

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
        <ReviewRow label={dict.urlSlug} value={values.slug || dict.notSet} />
        {values.featured ? <ReviewRow label={dict.featured} value={dict.featured} /> : null}
      </ReviewCard>

      <ReviewCard
        icon={RouteIcon}
        title={sections.route}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("route"))}
      >
        <ReviewRow
          label={sections.departure}
          value={place(values.departureCity, values.departureAirport, values.departureCountry)}
        />
        <ReviewRow
          label={sections.arrival}
          value={place(values.arrivalCity, values.arrivalAirport, values.arrivalCountry)}
        />
      </ReviewCard>

      <ReviewCard
        icon={Clock}
        title={sections.schedule}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("schedule"))}
      >
        <ReviewRow label={dict.departureTime} value={values.departureTime || dict.notSet} />
        <ReviewRow label={dict.arrivalTime} value={values.arrivalTime || dict.notSet} />
        <ReviewRow
          label={dict.durationMinutes}
          value={values.durationMinutes ? values.durationMinutes : dict.notSet}
        />
        <ReviewRow label={dict.stops} value={values.stops ?? 0} />
        <ReviewRow
          label={dict.cabinClass}
          value={values.cabinClass ? cabinClassLabels[values.cabinClass] : dict.notSet}
        />
      </ReviewCard>

      <ReviewCard
        icon={Plane}
        title={sections.airline}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("airline"))}
      >
        <ReviewRow label={dict.airline} value={values.airline || dict.notSet} />
        <ReviewRow label={dict.flightNumber} value={values.flightNumber || dict.notSet} />
      </ReviewCard>

      <ReviewCard
        icon={Banknote}
        title={sections.pricing}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("pricing"))}
      >
        <ReviewRow
          label={dict.basePrice}
          value={values.basePrice ? `${values.basePrice} ${values.currency}` : dict.notSet}
        />
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

export function FlightForm({ mode, tenantSlug, flight, onSubmit, locale }: Props) {
  const dict = getFlightsDict(locale).form;
  const sections = dict.sections;
  const cabinDict = getFlightsDict(locale).cabinClasses;
  const common = getCommonDict(locale);
  const CABIN_CLASS_LABELS: Record<(typeof CABIN_CLASSES)[number], string> = {
    ECONOMY: cabinDict.economy,
    PREMIUM_ECONOMY: cabinDict.premiumEconomy,
    BUSINESS: cabinDict.business,
    FIRST: cabinDict.first,
  };
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"primary" | null>(null);
  // Wizard-only (mode === "create"); unused, harmless state in edit mode.
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  // The URL slug is auto-generated from the name (see the effect below) and
  // rarely needs a human's attention, so it stays collapsed to a small,
  // low-emphasis preview by default rather than competing with Description
  // for space as a full field.
  const [slugExpanded, setSlugExpanded] = useState(false);
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  // Clears the persistent "add a picture" banner the instant a cover or
  // gallery image lands, without requiring another click on Next.
  useEffect(() => {
    if (cover != null || galleryImages.length > 0) setMediaError(null);
  }, [cover, galleryImages.length]);

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

  // Auto-generate the slug from the name while the user hasn't touched the
  // slug field yet. Subscribing via `form.watch(callback)` (rather than
  // reading `form.watch("name")`'s return value) never triggers a re-render
  // of this component — only the effect callback runs on each change.
  useEffect(() => {
    const subscription = form.watch((values, { name: changedField }) => {
      if (
        changedField === "name" &&
        !form.formState.dirtyFields.slug &&
        values.name !== flight?.name
      ) {
        form.setValue("slug", slugify(values.name ?? ""));
      }
    });
    return () => subscription.unsubscribe();
  }, [flight?.name, form]);

  function submitFlight(values: FlightFormInput) {
    if (mode === "create" && cover == null && galleryImages.length === 0) {
      setMediaError(dict.pictureRequired);
      toast.error(dict.pictureRequired);
      setStepIndex(stepIndexOf("media"));
      return;
    }
    setPendingAction("primary");
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
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/flights/${result.data.flightId}/edit`);
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
    try {
      const fields = STEP_VALIDATION_FIELDS[key];
      if (fields && fields.length > 0) {
        const valid = await form.trigger(fields);
        if (!valid) return;
      }
      if (key === "media" && cover == null && galleryImages.length === 0) {
        setMediaError(dict.pictureRequired);
        toast.error(dict.pictureRequired);
        return;
      }
      setMediaError(null);
      const next = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
      setStepIndex(next);
      setMaxStepReached((m) => Math.max(m, next));
    } catch {
      // A step's validation should never throw, but if it somehow does, say
      // so instead of leaving Next looking dead with no feedback at all.
      toast.error(common.somethingWentWrong);
    }
  }

  function goToPreviousStep() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function goToStep(index: number) {
    if (index <= maxStepReached) setStepIndex(index);
  }

  /** Safety net for the final "Publish Flight" submit: if full-schema
   * validation fails (e.g. the user unlocked Review, then jumped back and
   * broke an earlier step without re-running its "Next" check), surface it
   * instead of failing silently — jump to the first step holding an error. */
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
          (values) => submitFlight(values),
          mode === "create"
            ? () => {
                toast.error(dict.fixErrorsBeforePublishing);
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
                <TabsTrigger value="route" className="gap-1.5">
                  <RouteIcon className="size-4" />
                  {sections.route}
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-1.5">
                  <Clock className="size-4" />
                  {sections.schedule}
                </TabsTrigger>
                <TabsTrigger value="airline" className="gap-1.5">
                  <Plane className="size-4" />
                  {sections.airline}
                </TabsTrigger>
                <TabsTrigger value="pricing" className="gap-1.5">
                  <Banknote className="size-4" />
                  {sections.pricing}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="mt-6 space-y-6">
              <GeneralStep
                form={form}
                dict={dict}
                sections={sections}
                common={common}
                mode={mode}
                flight={flight}
                locale={locale}
                tenantSlug={tenantSlug}
                slugExpanded={slugExpanded}
                setSlugExpanded={setSlugExpanded}
              />
            </TabsContent>
            <TabsContent value="route" className="mt-6 space-y-3">
              <RouteStep form={form} dict={dict} sections={sections} />
            </TabsContent>
            <TabsContent value="schedule" className="mt-6">
              <ScheduleStep
                form={form}
                dict={dict}
                sections={sections}
                numeric={numeric}
                cabinClassLabels={CABIN_CLASS_LABELS}
              />
            </TabsContent>
            <TabsContent value="airline" className="mt-6">
              <AirlineStep form={form} dict={dict} sections={sections} />
            </TabsContent>
            <TabsContent value="pricing" className="mt-6">
              <PricingStep form={form} dict={dict} sections={sections} numeric={numeric} />
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
              <div className="space-y-6">
                <GeneralStep
                  form={form}
                  dict={dict}
                  sections={sections}
                  common={common}
                  mode={mode}
                  flight={flight}
                  locale={locale}
                  tenantSlug={tenantSlug}
                  slugExpanded={slugExpanded}
                  setSlugExpanded={setSlugExpanded}
                />
              </div>
            )}
            {currentStepKey === "route" && (
              <div className="space-y-3">
                <RouteStep form={form} dict={dict} sections={sections} />
              </div>
            )}
            {currentStepKey === "schedule" && (
              <ScheduleStep
                form={form}
                dict={dict}
                sections={sections}
                numeric={numeric}
                cabinClassLabels={CABIN_CLASS_LABELS}
              />
            )}
            {currentStepKey === "airline" && <AirlineStep form={form} dict={dict} sections={sections} />}
            {currentStepKey === "pricing" && (
              <PricingStep form={form} dict={dict} sections={sections} numeric={numeric} />
            )}
            {currentStepKey === "media" && (
              <MediaStep
                sections={sections}
                coverUploaderProps={coverUploaderProps}
                galleryUploaderProps={galleryUploaderProps}
                mediaError={mediaError}
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
                cabinClassLabels={CABIN_CLASS_LABELS}
              />
            )}
          </div>
        )}

        {mode === "edit" ? (
          <div className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-10 mt-6 flex items-center justify-end gap-2 rounded-lg border px-4 py-3 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${tenantSlug}/admin/flights`)}
              disabled={isPending}
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && pendingAction === "primary" ? dict.saving : dict.saveDetails}
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
                  {isPending && pendingAction === "primary" ? dict.publishing : dict.publishFlight}
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
