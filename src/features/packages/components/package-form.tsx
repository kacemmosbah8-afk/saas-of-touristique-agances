"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createPackageSchema,
  type CreatePackageInput,
  type CreatePackageWithMediaInput,
} from "@/features/packages/schemas/package.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  onSubmit: (values: CreatePackageWithMediaInput) => Promise<{ ok: boolean; error?: string }>;
  locale: Locale;
};

export function PackageForm({ tenantSlug, onSubmit, locale }: Props) {
  const dict = getAdminDictionary(locale).packages;
  const formDict = dict.createForm;
  const common = getAdminDictionary(locale).common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cover, coverUploaderProps } = usePendingCoverImage();
  const { images: galleryImages, galleryUploaderProps } = usePendingGallery();

  const form = useForm<CreatePackageInput>({
    resolver: zodResolver(createPackageSchema),
    defaultValues: { name: "", slug: "" },
  });

  const watchedName = form.watch("name");
  useEffect(() => {
    if (!form.formState.dirtyFields.slug) {
      form.setValue("slug", slugify(watchedName));
    }
  }, [watchedName, form]);

  function handleSubmit(values: CreatePackageInput) {
    if (cover == null && galleryImages.length === 0) {
      toast.error("Add a picture before saving.");
      return;
    }
    startTransition(async () => {
      const payload: CreatePackageWithMediaInput = {
        ...values,
        coverImage: cover,
        images: galleryImages.map(({ fileKey, url }) => ({ fileKey, url })),
      };
      const result = await onSubmit(payload);
      if (!result.ok) {
        toast.error(result.error ?? common.somethingWentWrong);
        return;
      }
      toast.success(formDict.created);
      router.push(`/${tenantSlug}/admin/packages`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formDict.name}</FormLabel>
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
            <FormItem>
              <FormLabel>{formDict.urlSlug}</FormLabel>
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

        <Separator />
        <div className="space-y-8">
          <CoverImageUploader
            {...coverUploaderProps}
            description={dict.coverImageDescription}
            locale={locale}
          />
          <GalleryUploader
            {...galleryUploaderProps}
            description={dict.galleryDescription}
            locale={locale}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? formDict.creating : formDict.createPackage}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${tenantSlug}/admin/packages`)}
          >
            {formDict.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
