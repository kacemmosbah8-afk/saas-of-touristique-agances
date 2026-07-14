"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { Button } from "@/shared/components/ui/button";

type Props = {
  imageUrl: string | null;
  canEdit: boolean;
  onUpload: (input: { fileKey: string; url: string }) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => Promise<{ ok: boolean; error?: string }>;
  title?: string;
  description?: string;
  /** CSS aspect-ratio class for the preview frame. */
  aspectClassName?: string;
};

/**
 * Generic single-image (cover / hero) uploader used by hotels, activities,
 * and destinations. Upload + persistence actions are injected so this stays
 * resource-agnostic.
 */
export function CoverImageUploader({
  imageUrl,
  canEdit,
  onUpload,
  onRemove,
  title = "Cover Image",
  description = "Recommended: 1200×630px.",
  aspectClassName = "aspect-[1200/630]",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("resourceCover", {
    onClientUploadComplete: (res) => {
      const file = res[0];
      if (!file) return;
      startTransition(async () => {
        const result = await onUpload({ fileKey: file.key, url: file.ufsUrl });
        if (!result.ok) {
          toast.error(result.error ?? "Failed to save image.");
          return;
        }
        toast.success("Image updated.");
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function handleRemove() {
    startTransition(async () => {
      const result = await onRemove();
      if (!result.ok) {
        toast.error(result.error ?? "Failed to remove image.");
        return;
      }
      toast.success("Image removed.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {imageUrl ? (
        <div className="relative overflow-hidden rounded-lg border">
          <div className={`relative w-full ${aspectClassName}`}>
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
            />
          </div>
          {canEdit && (
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-background/90"
                disabled={isLoading}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 size-4" />
                Replace
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-background/90 text-destructive hover:text-destructive"
                disabled={isLoading}
                onClick={handleRemove}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Remove</span>
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
            className="border-muted-foreground/25 hover:border-muted-foreground/50 focus-visible:ring-ring/50 flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="text-muted-foreground size-8" />
            <span className="text-muted-foreground text-sm">
              {isUploading ? "Uploading…" : "Click to upload image"}
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
