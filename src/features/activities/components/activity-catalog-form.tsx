"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm, Controller, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Info,
  MapPin,
  AlignLeft,
  ListChecks,
  Banknote,
  Image as ImageIcon,
  ClipboardCheck,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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

const NO_SUPPLIER = "__none__";

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
  { key: "location", icon: MapPin },
  { key: "description", icon: AlignLeft },
  { key: "inclusions", icon: ListChecks },
  { key: "pricing", icon: Banknote },
  { key: "media", icon: ImageIcon },
  { key: "review", icon: ClipboardCheck },
] as const;

type StepKey = (typeof WIZARD_STEPS)[number]["key"];

/** Fields validated (via `form.trigger`) before a step's "Next" is allowed
 * to advance. Media/Review have no react-hook-form fields of their own. */
const STEP_VALIDATION_FIELDS: Partial<Record<StepKey, Path<ActivityFormInput>[]>> = {
  general: ["name", "slug", "featured"],
  location: ["category", "durationMinutes", "city", "country", "meetingPoint"],
  description: ["description"],
  inclusions: ["includedItems", "excludedItems"],
  pricing: ["supplierId", "internalCost", "sellingPrice", "currency"],
};

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  activity?: ActivityDetail;
  suppliers: SupplierOption[];
  onSubmit: (
    values: ActivityFormInput | CreateActivityWithMediaInput,
  ) => Promise<{ ok: boolean; error?: string; data?: { activityId: string } }>;
  locale: Locale;
};

// --- Step components — each is a real function component so React only
// evaluates the JSX for the step that's actually rendered (create-mode
// wizard shows one at a time; edit-mode Tabs unmounts inactive content). ---

type ActivityDict = AdminDictionary["activities"]["form"];
type ActivitySections = ActivityDict["sections"];
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
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
  common: CommonDict;
  tenantSlug: string;
  slugExpanded: boolean;
  setSlugExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Card>
      <SectionHeading icon={Info} title={sections.general} description={sections.generalHint} />
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.nameAr}</FormLabel>
              <FormControl>
                <Input placeholder="جولة سفاري في الصحراء عند الغروب" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                /{tenantSlug}/activities/{form.watch("slug") || "…"}
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
                    <Input placeholder="sunset-desert-safari" {...field} />
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

function LocationStep({
  form,
  dict,
  sections,
  numeric,
}: {
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
  numeric: NumericHandler;
}) {
  return (
    <Card>
      <SectionHeading icon={MapPin} title={sections.location} description={sections.locationHint} />
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.categoryAr}</FormLabel>
              <FormControl>
                <Input placeholder="مغامرة، ثقافي…" {...field} value={field.value ?? ""} />
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
              <FormLabel>{dict.cityAr}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
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
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meetingPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.meetingPointAr}</FormLabel>
              <FormControl>
                <Input placeholder="بهو الفندق، البوابة الرئيسية…" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

function DescriptionStep({
  form,
  dict,
  sections,
}: {
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
}) {
  return (
    <Card>
      <SectionHeading icon={AlignLeft} title={sections.description} description={sections.descriptionHint} />
      <CardContent>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.descriptionAr}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="صف النشاط…"
                  className="min-h-[120px]"
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

function InclusionsStep({
  form,
  dict,
  sections,
  isPending,
  locale,
}: {
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
  isPending: boolean;
  locale: Locale;
}) {
  return (
    <Card>
      <SectionHeading icon={ListChecks} title={sections.inclusions} description={sections.inclusionsHint} />
      <CardContent className="space-y-6">
        <FormItem>
          <FormLabel>{dict.includedAr}</FormLabel>
          <Controller
            control={form.control}
            name="includedItems"
            render={({ field }) => (
              <ListEditor
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="النقل، الوجبات، دخول المتحف…"
                disabled={isPending}
                locale={locale}
              />
            )}
          />
        </FormItem>

        <FormItem>
          <FormLabel>{dict.excludedAr}</FormLabel>
          <Controller
            control={form.control}
            name="excludedItems"
            render={({ field }) => (
              <ListEditor
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="الإكراميات، المصاريف الشخصية…"
                disabled={isPending}
                locale={locale}
              />
            )}
          />
        </FormItem>
      </CardContent>
    </Card>
  );
}

function PricingStep({
  form,
  dict,
  sections,
  suppliers,
  numeric,
}: {
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
  suppliers: SupplierOption[];
  numeric: NumericHandler;
}) {
  return (
    <Card>
      <SectionHeading icon={Banknote} title={sections.pricing} description={sections.pricingHint} />
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.supplier}</FormLabel>
              <Select
                value={field.value ? field.value : NO_SUPPLIER}
                onValueChange={(v) => field.onChange(v === NO_SUPPLIER ? "" : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.noSupplier} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>{dict.noSupplier}</SelectItem>
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

        <div className="grid gap-4 sm:grid-cols-2">
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
                  <FormLabel>{dict.sellingPrice}</FormLabel>
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
                  <FormLabel>{dict.currency}</FormLabel>
                  <FormControl>
                    <Input maxLength={3} className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
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
  sections: ActivitySections;
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
  suppliers,
  goToStep,
  stepIndexOf,
  cover,
  galleryImages,
}: {
  form: UseFormReturn<ActivityFormInput>;
  dict: ActivityDict;
  sections: ActivitySections;
  common: CommonDict;
  suppliers: SupplierOption[];
  goToStep: (index: number) => void;
  stepIndexOf: (key: StepKey) => number;
  cover: ReturnType<typeof usePendingCoverImage>["cover"];
  galleryImages: ReturnType<typeof usePendingGallery>["images"];
}) {
  const values = form.getValues();
  const place = (city?: string, country?: string) =>
    [city, country].filter(Boolean).join(" · ") || dict.notSet;
  const supplierName = suppliers.find((s) => s.id === values.supplierId)?.name ?? dict.noSupplier;

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
        icon={MapPin}
        title={sections.location}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("location"))}
      >
        <ReviewRow label={sections.location} value={place(values.city, values.country)} />
        <ReviewRow
          label={dict.durationMinutes}
          value={values.durationMinutes ? values.durationMinutes : dict.notSet}
        />
        <ReviewRow label={dict.meetingPointAr} value={values.meetingPoint || dict.notSet} />
      </ReviewCard>

      <ReviewCard
        icon={AlignLeft}
        title={sections.description}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("description"))}
      >
        <ReviewRow label={dict.descriptionAr} value={values.description || dict.notSet} />
      </ReviewCard>

      <ReviewCard
        icon={ListChecks}
        title={sections.inclusions}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("inclusions"))}
      >
        <ReviewRow
          label={dict.includedAr}
          value={(values.includedItems?.length ?? 0) > 0 ? values.includedItems!.join(", ") : dict.notSet}
        />
        <ReviewRow
          label={dict.excludedAr}
          value={(values.excludedItems?.length ?? 0) > 0 ? values.excludedItems!.join(", ") : dict.notSet}
        />
      </ReviewCard>

      <ReviewCard
        icon={Banknote}
        title={sections.pricing}
        editLabel={common.edit}
        onEdit={() => goToStep(stepIndexOf("pricing"))}
      >
        <ReviewRow label={dict.supplier} value={supplierName} />
        <ReviewRow
          label={dict.sellingPrice}
          value={values.sellingPrice != null ? `${values.sellingPrice} ${values.currency}` : dict.notSet}
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

export function ActivityCatalogForm({ mode, tenantSlug, activity, suppliers, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).activities.form;
  const sections = dict.sections;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Wizard-only (mode === "create"); unused, harmless state in edit mode.
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [slugExpanded, setSlugExpanded] = useState(false);
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: activity?.name ?? "",
      slug: activity?.slug ?? "",
      featured: activity?.featured ?? false,
      category: activity?.category ?? "",
      durationMinutes: activity?.durationMinutes ?? undefined,
      meetingPoint: activity?.meetingPoint ?? "",
      description: activity?.description ?? "",
      includedItems: activity?.includedItems ?? [],
      excludedItems: activity?.excludedItems ?? [],
      country: activity?.country ?? "",
      city: activity?.city ?? "",
      supplierId: activity?.supplierId ?? "",
      internalCost: activity?.internalCost ?? undefined,
      sellingPrice: activity?.sellingPrice ?? undefined,
      currency: activity?.currency ?? "USD",
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
        values.name !== activity?.name
      ) {
        form.setValue("slug", slugify(values.name ?? ""));
      }
    });
    return () => subscription.unsubscribe();
  }, [activity?.name, form]);

  function submitActivity(values: ActivityFormInput) {
    if (mode === "create" && cover == null && galleryImages.length === 0) {
      toast.error(dict.pictureRequired);
      return;
    }
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
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      if (mode === "create" && result.data) {
        toast.success(dict.created);
        router.push(`/${tenantSlug}/admin/activities/${result.data.activityId}/edit`);
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
          submitActivity,
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
          <div className="space-y-6">
            <GeneralStep
              form={form}
              dict={dict}
              sections={sections}
              common={common}
              tenantSlug={tenantSlug}
              slugExpanded={slugExpanded}
              setSlugExpanded={setSlugExpanded}
            />
            <LocationStep form={form} dict={dict} sections={sections} numeric={numeric} />
            <DescriptionStep form={form} dict={dict} sections={sections} />
            <InclusionsStep form={form} dict={dict} sections={sections} isPending={isPending} locale={locale} />
            <PricingStep form={form} dict={dict} sections={sections} suppliers={suppliers} numeric={numeric} />
          </div>
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
            {currentStepKey === "description" && (
              <DescriptionStep form={form} dict={dict} sections={sections} />
            )}
            {currentStepKey === "inclusions" && (
              <InclusionsStep form={form} dict={dict} sections={sections} isPending={isPending} locale={locale} />
            )}
            {currentStepKey === "pricing" && (
              <PricingStep form={form} dict={dict} sections={sections} suppliers={suppliers} numeric={numeric} />
            )}
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
                suppliers={suppliers}
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
              onClick={() => router.push(`/${tenantSlug}/admin/activities`)}
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
                  {isPending ? dict.saving : dict.createActivity}
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
