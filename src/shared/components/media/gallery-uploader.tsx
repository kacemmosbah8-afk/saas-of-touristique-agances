"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useImageUpload } from "@/shared/lib/storage/use-image-upload";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export type GalleryImage = { id: string; url: string; alt: string | null };

type Props = {
  images: GalleryImage[];
  canEdit: boolean;
  onAdd: (input: { fileKey: string; url: string }) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (imageId: string) => Promise<{ ok: boolean; error?: string }>;
  title?: string;
  description?: string;
  max?: number;
};

/**
 * Generic multi-image gallery used by hotels, activities, and destinations.
 * Add/delete actions are injected so this stays resource-agnostic. Supports
 * both click-to-upload and dropping one or more files anywhere on the
 * gallery area (empty or already populated) up to the remaining slot count.
 */
export function GalleryUploader({
  images,
  canEdit,
  onAdd,
  onDelete,
  title = "Gallery",
  description = "Additional images shown on the detail page.",
  max = 10,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = max - images.length;

  const { startUpload, isUploading } = useImageUpload("resource-gallery", {
    onUploadComplete: (files) => {
      startTransition(async () => {
        const results = await Promise.all(
          files.map((file) => onAdd({ fileKey: file.key, url: file.url })),
        );
        if (results.some((r) => !r.ok)) {
          toast.error("Some images failed to save.");
        } else {
          toast.success(`${files.length} image${files.length !== 1 ? "s" : ""} added.`);
        }
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await onDelete(imageId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to remove image.");
        return;
      }
      toast.success("Image removed.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  function handleDragOver(e: React.DragEvent) {
    if (!canEdit || isLoading || remaining <= 0) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit || isLoading || remaining <= 0) return;
    const files = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);
    if (files.length > 0) startUpload(files);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {canEdit && remaining > 0 && (
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-muted-foreground/25 hover:border-muted-foreground/50 focus-visible:ring-ring/50 flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
              isDragOver && "border-primary bg-primary/5",
            )}
          >
            <ImagePlus className="text-muted-foreground size-7" />
            <span className="text-muted-foreground text-sm">
              {isUploading ? "Uploading…" : isDragOver ? "Drop to upload" : "Drag and drop, or click to add images"}
            </span>
          </button>
        ) : (
          <p className="text-muted-foreground text-sm">No images.</p>
        )
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative grid grid-cols-2 gap-3 rounded-lg border-2 border-dashed border-transparent p-1 transition-colors sm:grid-cols-3",
            isDragOver && "border-primary bg-primary/5",
          )}
        >
          {isDragOver && (
            <div className="bg-primary/10 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
              <p className="bg-background rounded-full px-4 py-1.5 text-sm font-medium shadow-sm">
                Drop to add
              </p>
            </div>
          )}
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
                  className="bg-background/80 focus-visible:ring-ring/50 absolute top-1.5 right-1.5 rounded p-1 opacity-0 transition-opacity outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] disabled:opacity-50"
                >
                  <Trash2 className="text-destructive size-4" />
                  <span className="sr-only">Remove image</span>
                </button>
              )}
            </div>
          ))}
          {canEdit && remaining > 0 && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => inputRef.current?.click()}
              className="border-muted-foreground/25 hover:border-muted-foreground/50 focus-visible:ring-ring/50 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="text-muted-foreground size-6" />
              <span className="text-muted-foreground text-xs">Add more</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, remaining);
          if (files.length > 0) startUpload(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
