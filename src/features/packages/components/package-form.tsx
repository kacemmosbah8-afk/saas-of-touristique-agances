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
};

export function PackageForm({ tenantSlug, onSubmit }: Props) {
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
    startTransition(async () => {
      const payload: CreatePackageWithMediaInput = {
        ...values,
        coverImage: cover,
        images: galleryImages.map(({ fileKey, url }) => ({ fileKey, url })),
      };
      const result = await onSubmit(payload);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Package created.");
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
              <FormLabel>Name</FormLabel>
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
              <FormLabel>URL Slug</FormLabel>
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
            description="Displayed at the top of the package listing. Recommended: 1200×630px."
          />
          <GalleryUploader
            {...galleryUploaderProps}
            description="Up to 10 additional images. Shown in the package detail page."
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create Package"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${tenantSlug}/admin/packages`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
