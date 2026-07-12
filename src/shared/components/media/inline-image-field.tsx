"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { Button } from "@/shared/components/ui/button";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  max?: number;
};

/**
 * Controlled image-array field. Uploads via UploadThing and stores the
 * resulting URLs directly in the form value — used for small inline galleries
 * (e.g. room-type photos) that are saved as part of their parent form rather
 * than through a dedicated persistence action.
 */
export function InlineImageField({ value, onChange, disabled, max = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("resourceGallery", {
    onClientUploadComplete: (res) => {
      const urls = res.map((f) => f.ufsUrl);
      onChange([...value, ...urls].slice(0, max));
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const isBusy = disabled || isUploading;

  return (
    <div className="space-y-2">
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
                className="bg-background/80 absolute top-1 right-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              >
                <X className="text-destructive size-3.5" />
                <span className="sr-only">Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-1.5 size-4" />
          {isUploading ? "Uploading…" : "Add Photos"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) startUpload(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
