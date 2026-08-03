"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm, Controller, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Info,
  MapPin,
  Landmark,
  Image as ImageIcon,
  Languages,
  ListChecks,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type AdminDictionary = ReturnType<typeof getAdminDictionary>;
type FormDict = AdminDictionary["destinations"]["form"];
type SectionsDict = FormDict["sections"];
type CommonDict = AdminDictionary["common"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
  { key: "content", icon: Landmark },
  { key: "media", icon: ImageIcon },
  { key: "review", icon: ListChecks },
] as const;

type StepKey = (typeof WIZARD_STEPS)[number]["key"];

/** Fields validated (via `form.trigger`) before a step's "Next" is allowed
 * to advance. Media/Review have no react-hook-form fields of their own. */
const STEP_VALIDATION_FIELDS: Partial<Record<StepKey, Path<DestinationDetailsInput>[]>> = {
  general: ["name", "nameFr", "slug", "featured", "description", "descriptionFr"],
  location: ["country", "countryFr", "region", "regionFr", "city", "cityFr"],
  content: ["popularAttractions", "popularAttractionsFr"],
};

// --- Step components — each defined as an actual function component (not a
// JSX const built unconditionally in the render body) so React never even
// calls its body for a step that isn't currently visible. ---

function GeneralStep({
  form,
  dict,
  sections,
  tenantSlug,
  slugExpanded,
  setSlugExpanded,
  common,
}: {
  form: UseFormReturn<DestinationDetailsInput>;
  dict: FormDict;
  sections: SectionsDict;
  tenantSlug: string;
  slugExpanded: boolean;
  setSlugExpanded: (updater: (value: boolean) => boolean) => void;
  common: CommonDict;
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
                    <Input placeholder="مراكش" dir="rtl" {...field} />
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
                    <Input placeholder="Marrakech" {...field} value={field.value ?? ""} />
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
                      <Textarea className="min-h-[120px]" dir="rtl" {...field} value={field.value ?? ""} />
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
                      <Textarea className="min-h-[120px]" {...field} value={field.value ?? ""} />
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
                /{tenantSlug}/destinations/{form.watch("slug") || "…"}
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
                    <Input placeholder="marrakech" {...field} />
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
}: {
  form: UseFormReturn<DestinationDetailsInput>;
  dict: FormDict;
  sections: SectionsDict;
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.countryAr}</FormLabel>
                    <FormControl>
                      <Input placeholder="المغرب" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.regionAr}</FormLabel>
                    <FormControl>
                      <Input placeholder="مراكش آسفي" dir="rtl" {...field} value={field.value ?? ""} />
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
                    <FormLabel>{dict.cityAr}</FormLabel>
                    <FormControl>
                      <Input dir="rtl" {...field} value={field.value ?? ""} />
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
                name="regionFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.regionFr}</FormLabel>
                    <FormControl>
                      <Input placeholder="Marrakech-Safi" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cityFr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.cityFr}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FallbackHint>{dict.optionalFallsBackAr}</FallbackHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          }
        />
      </CardContent>
    </Card>
  );
}

function ContentStep({
  form,
  dict,
  sections,
  isPending,
  locale,
}: {
  form: UseFormReturn<DestinationDetailsInput>;
  dict: FormDict;
  sections: SectionsDict;
  isPending: boolean;
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={Landmark} title={sections.content} description={sections.contentHint} />
      <CardContent className="space-y-6">
        <LanguageFields
          ar={
            <FormItem>
              <FormLabel>{dict.attractionsAr}</FormLabel>
              <Controller
                control={form.control}
                name="popularAttractions"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="جامع الفنا، قصر الباهية…"
                    disabled={isPending}
                    locale={locale}
                  />
                )}
              />
            </FormItem>
          }
          fr={
            <FormItem>
              <FormLabel>{dict.attractionsFr}</FormLabel>
              <Controller
                control={form.control}
                name="popularAttractionsFr"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Jemaa el-Fnaa, Bahia Palace…"
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

function MediaStep({
  sections,
  coverUploaderProps,
  galleryUploaderProps,
  heroImageTitle,
  heroImageDescription,
  locale,
}: {
  sections: SectionsDict;
  coverUploaderProps: ReturnType<typeof usePendingCoverImage>["coverUploaderProps"];
  galleryUploaderProps: ReturnType<typeof usePendingGallery>["galleryUploaderProps"];
  heroImageTitle: string;
  heroImageDescription: string;
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={ImageIcon} title={sections.media} description={sections.mediaHint} />
      <CardContent className="space-y-8">
        <CoverImageUploader
          {...coverUploaderProps}
          title={heroImageTitle}
          description={heroImageDescription}
          aspectClassName="aspect-[1600/600]"
          locale={locale}
        />
        <GalleryUploader {...galleryUploaderProps} locale={locale} />
      </CardContent>
    </Card>
  );
}

function ReviewStep({
  form,
  dict,
  sections,
  common,
  cover,
  galleryImages,
  goToStep,
  stepIndexOf,
}: {
  form: UseFormReturn<DestinationDetailsInput>;
  dict: FormDict;
  sections: SectionsDict;
  common: CommonDict;
  cover: ReturnType<typeof usePendingCoverImage>["cover"];
  galleryImages: ReturnType<typeof usePendingGallery>["images"];
  goToStep: (index: number) => void;
  stepIndexOf: (key: StepKey) => number;
}) {
  const values = form.getValues();
  const place = (country?: string, region?: string, city?: string) =>
    [city, region, country].filter(Boolean).join(" · ") || dict.notSet;

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
        <ReviewRow label={sections.location} value={place(values.country, values.region, values.city)} />
      </ReviewCard>

      <ReviewCard
        icon={Landmark}
        title={sections.content}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("content"))}
      >
        <ReviewRow
          label={dict.attractionsAr}
          value={
            (values.popularAttractions?.length ?? 0) > 0 ? values.popularAttractions!.join(", ") : dict.notSet
          }
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

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  destination?: DestinationDetail;
  onSubmit: (
    values: DestinationDetailsInput | CreateDestinationWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { destinationId: string } }>;
  locale: Locale;
};

export function DestinationDetailsForm({ mode, tenantSlug, destination, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).destinations;
  const formDict = dict.form;
  const sections = formDict.sections;
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

  // Non-rendering subscription: reads the "name" field on every keystroke
  // without subscribing this component to re-render, so switching steps in
  // the wizard doesn't reconstruct every other step's JSX (including the
  // full Review summary) on every character typed.
  useEffect(() => {
    const subscription = form.watch((values, { name: changedField }) => {
      if (
        changedField === "name" &&
        !form.formState.dirtyFields.slug &&
        values.name !== destination?.name
      ) {
        form.setValue("slug", slugify(values.name ?? ""));
      }
    });
    return () => subscription.unsubscribe();
  }, [destination?.name, form]);

  function submitDestination(values: DestinationDetailsInput) {
    if (mode === "create" && cover == null && galleryImages.length === 0) {
      toast.error(formDict.pictureRequired);
      return;
    }
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
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(formDict.created);
        router.push(`/${tenantSlug}/admin/destinations/${result.data.destinationId}/edit`);
      } else {
        toast.success(formDict.saved);
        router.refresh();
      }
    });
  }

  const stepIndexOf = (key: StepKey) => WIZARD_STEPS.findIndex((s) => s.key === key);

  async function goToNextStep() {
    const key = WIZARD_STEPS[stepIndex].key;
    const fields = STEP_VALIDATION_FIELDS[key];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    if (key === "media" && cover == null && galleryImages.length === 0) {
      toast.error(formDict.pictureRequired);
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
          submitDestination,
          mode === "create"
            ? () => {
                toast.error(formDict.fixErrorsBeforeSubmitting);
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
                <TabsTrigger value="content" className="gap-1.5">
                  <Landmark className="size-4" />
                  {sections.content}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="mt-6">
              <GeneralStep
                form={form}
                dict={formDict}
                sections={sections}
                tenantSlug={tenantSlug}
                slugExpanded={slugExpanded}
                setSlugExpanded={setSlugExpanded}
                common={common}
              />
            </TabsContent>
            <TabsContent value="location" className="mt-6">
              <LocationStep form={form} dict={formDict} sections={sections} />
            </TabsContent>
            <TabsContent value="content" className="mt-6">
              <ContentStep form={form} dict={formDict} sections={sections} isPending={isPending} locale={locale} />
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            {/* Progress indicator */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  {formDict.stepIndicator(stepIndex + 1, WIZARD_STEPS.length)}
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
                dict={formDict}
                sections={sections}
                tenantSlug={tenantSlug}
                slugExpanded={slugExpanded}
                setSlugExpanded={setSlugExpanded}
                common={common}
              />
            )}
            {currentStepKey === "location" && <LocationStep form={form} dict={formDict} sections={sections} />}
            {currentStepKey === "content" && (
              <ContentStep form={form} dict={formDict} sections={sections} isPending={isPending} locale={locale} />
            )}
            {currentStepKey === "media" && (
              <MediaStep
                sections={sections}
                coverUploaderProps={coverUploaderProps}
                galleryUploaderProps={galleryUploaderProps}
                heroImageTitle={dict.heroImageTitle}
                heroImageDescription={dict.heroImageDescription}
                locale={locale}
              />
            )}
            {currentStepKey === "review" && (
              <ReviewStep
                form={form}
                dict={formDict}
                sections={sections}
                common={common}
                cover={cover}
                galleryImages={galleryImages}
                goToStep={goToStep}
                stepIndexOf={stepIndexOf}
              />
            )}
          </div>
        )}

        {mode === "edit" ? (
          <div className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-10 mt-6 flex items-center justify-end gap-2 rounded-lg border px-4 py-3 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${tenantSlug}/admin/destinations`)}
              disabled={isPending}
            >
              {formDict.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? formDict.saving : formDict.saveDetails}
            </Button>
          </div>
        ) : (
          <div className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-2 rounded-lg border px-4 py-3 shadow-sm backdrop-blur">
            <div>
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isPending}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                  {formDict.previous}
                </Button>
              )}
            </div>
            <div>
              {isLastStep ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? formDict.saving : formDict.createDestination}
                </Button>
              ) : (
                <Button type="button" onClick={goToNextStep} disabled={isPending}>
                  {formDict.next}
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
