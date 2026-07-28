"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useImageUpload } from "@/shared/lib/storage/use-image-upload";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary, defaultAdminLocale } from "@/shared/i18n/admin-dictionary";

type Props = {
  imageUrl: string | null;
  canEdit: boolean;
  onUpload: (input: { fileKey: string; url: string }) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => Promise<{ ok: boolean; error?: string }>;
  title?: string;
  description?: string;
  /** CSS aspect-ratio class for the preview frame. */
  aspectClassName?: string;
  locale?: Locale;
};

/**
 * Generic single-image (cover / hero) uploader used by hotels, activities,
 * and destinations. Upload + persistence actions are injected so this stays
 * resource-agnostic. Supports both click-to-upload and drag-and-drop —
 * dropping a file works whether or not a cover image is already set.
 */
export function CoverImageUploader({
  imageUrl,
  canEdit,
  onUpload,
  onRemove,
  title,
  description,
  aspectClassName = "aspect-[1200/630]",
  locale = defaultAdminLocale,
}: Props) {
  const dict = getAdminDictionary(locale).common.media;
  const resolvedTitle = title ?? dict.coverImageTitle;
  const resolvedDescription = description ?? dict.coverImageDescription;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useImageUpload("resource-cover", {
    onUploadComplete: (files) => {
      const file = files[0];
      if (!file) return;
      startTransition(async () => {
        const result = await onUpload({ fileKey: file.fileKey, url: file.url });
        if (!result.ok) {
          toast.error(result.error ?? dict.failedToSaveImage);
          return;
        }
        toast.success(dict.imageUpdated);
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`${dict.uploadFailedPrefix} ${err.message}`);
    },
  });

  function handleRemove() {
    startTransition(async () => {
      const result = await onRemove();
      if (!result.ok) {
        toast.error(result.error ?? dict.failedToRemoveImage);
        return;
      }
      toast.success(dict.imageRemoved);
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  function handleDragOver(e: React.DragEvent) {
    if (!canEdit || isLoading) return;
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
    if (!canEdit || isLoading) return;
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) startUpload([file]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{resolvedTitle}</h3>
        <p className="text-muted-foreground text-sm">{resolvedDescription}</p>
      </div>

      {imageUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative overflow-hidden rounded-lg border-2 border-dashed border-transparent transition-colors",
            isDragOver && "border-primary bg-primary/5",
          )}
        >
          <div className={`relative w-full ${aspectClassName}`}>
            <Image
              src={imageUrl}
              alt={resolvedTitle}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
            />
          </div>
          {isDragOver && (
            <div className="bg-primary/10 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
              <p className="bg-background rounded-full px-4 py-1.5 text-sm font-medium shadow-sm">
                {dict.dropToReplace}
              </p>
            </div>
          )}
          {canEdit && (
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-background/90"
                disabled={isLoading}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="me-1.5 size-4" />
                {dict.replace}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-background/90 text-destructive hover:text-destructive"
                disabled={isLoading}
                onClick={handleRemove}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">{dict.removeImageAria}</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        canEdit && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-muted-foreground/25 hover:border-muted-foreground/50 focus-visible:ring-ring/50 flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
              isDragOver && "border-primary bg-primary/5",
            )}
          >
            <ImagePlus className="text-muted-foreground size-8" />
            <span className="text-muted-foreground text-sm">
              {isUploading
                ? dict.uploading
                : isDragOver
                  ? dict.dropToUpload
                  : dict.dragAndDropOrClickUpload}
            </span>
          </button>
        )
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startUpload([file]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
