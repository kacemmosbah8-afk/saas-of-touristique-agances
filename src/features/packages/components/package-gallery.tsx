"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { addGalleryImageAction } from "@/features/packages/actions/add-gallery-image.action";
import { deleteGalleryImageAction } from "@/features/packages/actions/delete-gallery-image.action";
import type { PackageImage } from "@/features/packages/queries/get-package.query";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantId: string;
  packageId: string;
  images: PackageImage[];
  canEdit: boolean;
};

export function PackageGallery({ tenantId, packageId, images, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("packageGallery", {
    onClientUploadComplete: (res) => {
      startTransition(async () => {
        const results = await Promise.all(
          res.map((file) =>
            addGalleryImageAction(tenantId, packageId, {
              fileKey: file.key,
              url: file.ufsUrl,
            }),
          ),
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          toast.error("Some images failed to save.");
        } else {
          toast.success(`${res.length} image${res.length !== 1 ? "s" : ""} added.`);
        }
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    startUpload(files);
    e.target.value = "";
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteGalleryImageAction(tenantId, packageId, imageId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Image removed.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Gallery</h3>
          <p className="text-muted-foreground text-sm">
            Up to 10 additional images. Shown in the package detail page.
          </p>
        </div>
        {canEdit && images.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 size-4" />
            {isUploading ? "Uploading…" : "Add Images"}
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        canEdit ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            className="border-muted-foreground/25 hover:border-muted-foreground/50 flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="text-muted-foreground size-7" />
            <span className="text-muted-foreground text-sm">
              {isUploading ? "Uploading…" : "Click to add gallery images"}
            </span>
          </button>
        ) : (
          <p className="text-muted-foreground text-sm">No gallery images.</p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border">
              <div className="relative aspect-square">
                <Image
                  src={img.url}
                  alt={img.alt ?? "Gallery image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDelete(img.id)}
                  className="bg-background/80 absolute top-1.5 right-1.5 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="text-destructive size-4" />
                  <span className="sr-only">Remove image</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
