"use client";

import { useState } from "react";

export type UploadedImage = { fileKey: string; url: string };

type UploadResponse =
  | { ok: true; data: UploadedImage }
  | { ok: false; error: string };

async function uploadOne(file: File, folder: string): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload-image", { method: "POST", body: formData });

  // A non-JSON response means something outside our own route handler
  // rejected the request (a platform body-size limit, an auth redirect,
  // a proxy error page, ...) — report the HTTP status instead of a
  // content-free "please try again" so the real cause is diagnosable
  // from the error message alone, not just server logs.
  const body: UploadResponse = await res.json().catch(() => ({
    ok: false,
    error: `Upload failed (server returned ${res.status} ${res.statusText || ""}).`.trim(),
  }));

  if (!body.ok) throw new Error(body.error);
  return body.data;
}

/**
 * Client-side image upload against `/api/upload-image` (Supabase Storage
 * server-side) — the direct replacement for UploadThing's `useUploadThing`
 * hook, kept API-compatible (`startUpload` / `isUploading`) so the media
 * components built around that shape needed no structural changes.
 */
export function useImageUpload(
  folder: string,
  options: {
    onUploadComplete: (files: UploadedImage[]) => void;
    onUploadError: (error: Error) => void;
  },
) {
  const [isUploading, setIsUploading] = useState(false);

  async function startUpload(files: File[]) {
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadOne(f, folder)));
      options.onUploadComplete(uploaded);
    } catch (err) {
      options.onUploadError(err instanceof Error ? err : new Error("Upload failed."));
    } finally {
      setIsUploading(false);
    }
  }

  return { startUpload, isUploading };
}
