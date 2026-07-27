"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { useImageUpload } from "@/shared/lib/storage/use-image-upload";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary, defaultAdminLocale } from "@/shared/i18n/admin-dictionary";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  max?: number;
  locale?: Locale;
};

/**
 * Controlled image-array field. Uploads via Supabase Storage and stores the
 * resulting URLs directly in the form value — used for small inline galleries
 * (e.g. room-type photos) that are saved as part of their parent form rather
 * than through a dedicated persistence action. Accepts drag-and-drop as well
 * as click-to-upload.
 */
export function InlineImageField({
  value,
  onChange,
  disabled,
  max = 6,
  locale = defaultAdminLocale,
}: Props) {
  const dict = getAdminDictionary(locale).common.media;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const remaining = max - value.length;

  const { startUpload, isUploading } = useImageUpload("resource-gallery", {
    onUploadComplete: (files) => {
      onChange([...value, ...files.map((f) => f.url)].slice(0, max));
    },
    onUploadError: (err) => {
      toast.error(`${dict.uploadFailedPrefix} ${err.message}`);
    },
  });

  const isBusy = disabled || isUploading;

  function handleDragOver(e: React.DragEvent) {
    if (isBusy || remaining <= 0) return;
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
    if (isBusy || remaining <= 0) return;
    const files = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);
    if (files.length > 0) startUpload(files);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "space-y-2 rounded-md border-2 border-dashed border-transparent p-1 transition-colors",
        isDragOver && "border-primary bg-primary/5",
      )}
    >
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <div key={url} className="group relative overflow-hidden rounded-md border">
              <div className="relative aspect-square">
                <Image src={url} alt="" fill className="object-cover" sizes="120px" />
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="bg-background/80 focus-visible:ring-ring/50 absolute top-1 right-1 rounded p-0.5 opacity-0 transition-opacity outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] disabled:opacity-50"
              >
                <X className="text-destructive size-3.5" />
                <span className="sr-only">{dict.removeImageAria}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="me-1.5 size-4" />
          {isUploading ? dict.uploading : isDragOver ? dict.dropToUpload : dict.addPhotosOrDrag}
        </Button>
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
