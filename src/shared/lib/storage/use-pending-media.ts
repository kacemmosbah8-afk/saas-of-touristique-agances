"use client";

import { useState } from "react";

import type { UploadedImage } from "@/shared/lib/storage/use-image-upload";

/**
 * Holds an uploaded-but-not-yet-saved cover image in local state, exposing
 * it as `CoverImageUploader`-compatible props. For create forms: the file
 * already lives in Supabase Storage the moment it's dropped (uploads don't
 * need a resource id), but attaching it to a DB record happens later, when
 * the surrounding form submits — so `onUpload`/`onRemove` just update local
 * state instead of calling a persistence action.
 */
export function usePendingCoverImage() {
  const [cover, setCover] = useState<UploadedImage | null>(null);

  return {
    cover,
    coverUploaderProps: {
      imageUrl: cover?.url ?? null,
      canEdit: true,
      onUpload: async (input: UploadedImage) => {
        setCover(input);
        return { ok: true as const };
      },
      onRemove: async () => {
        setCover(null);
        return { ok: true as const };
      },
    },
  };
}

type PendingGalleryImage = UploadedImage & { tempId: string };

/** Same idea as `usePendingCoverImage`, for `GalleryUploader`'s multi-image case. */
export function usePendingGallery() {
  const [images, setImages] = useState<PendingGalleryImage[]>([]);

  return {
    images,
    galleryUploaderProps: {
      images: images.map((img) => ({ id: img.tempId, url: img.url, alt: null })),
      canEdit: true,
      onAdd: async (input: UploadedImage) => {
        setImages((prev) => [...prev, { ...input, tempId: crypto.randomUUID() }]);
        return { ok: true as const };
      },
      onDelete: async (tempId: string) => {
        setImages((prev) => prev.filter((img) => img.tempId !== tempId));
        return { ok: true as const };
      },
    },
  };
}
