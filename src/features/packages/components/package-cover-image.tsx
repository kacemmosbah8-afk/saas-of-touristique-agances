"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { updatePackageCoverAction } from "@/features/packages/actions/update-package-cover.action";
import { deletePackageCoverAction } from "@/features/packages/actions/delete-package-cover.action";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantId: string;
  packageId: string;
  coverImageUrl: string | null;
  canEdit: boolean;
};

export function PackageCoverImage({ tenantId, packageId, coverImageUrl, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("packageCover", {
    onClientUploadComplete: (res) => {
      const file = res[0];
      if (!file) return;
      startTransition(async () => {
        const result = await updatePackageCoverAction(tenantId, packageId, {
          fileKey: file.key,
          url: file.ufsUrl,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Cover image updated.");
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload([file]);
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await deletePackageCoverAction(tenantId, packageId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cover image removed.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Cover Image</h3>
        <p className="text-muted-foreground text-sm">
          Displayed at the top of the package listing. Recommended: 1200×630px.
        </p>
      </div>

      {coverImageUrl ? (
        <div className="relative overflow-hidden rounded-lg border">
          <div className="relative aspect-[1200/630] w-full">
            <Image
              src={coverImageUrl}
              alt="Package cover"
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
            className="border-muted-foreground/25 hover:border-muted-foreground/50 flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="text-muted-foreground size-8" />
            <span className="text-muted-foreground text-sm">
              {isUploading ? "Uploading…" : "Click to upload cover image"}
            </span>
          </button>
        )
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
