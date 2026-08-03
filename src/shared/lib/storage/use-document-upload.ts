"use client";

import { useState } from "react";

// Extensions + MIME types together give the OS file picker the best chance
// of pre-filtering correctly across browsers. The real enforcement is
// server-side (`isAllowedDocumentType` in supabase-provider.ts) — this is
// just a UX hint, not a security boundary.
export const DOCUMENT_ACCEPT =
  "application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.html";

export type UploadedDocument = {
  fileKey: string;
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

type UploadResponse =
  | { ok: true; data: { fileKey: string; url: string } }
  | { ok: false; error: string };

async function uploadOne(file: File, folder: string): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload-document", { method: "POST", body: formData });
  const body: UploadResponse = await res.json().catch(() => ({
    ok: false,
    error: "Upload failed. Please try again.",
  }));

  if (!body.ok) throw new Error(body.error);
  return { ...body.data, name: file.name, mimeType: file.type, sizeBytes: file.size };
}

/**
 * Client-side document upload against `/api/upload-document` (Supabase
 * Storage server-side) — the replacement for UploadThing's `useUploadThing`
 * hook for the `documentFile`/`supplierDocument` endpoints, kept
 * API-compatible (`startUpload` / `isUploading`) so the components built
 * around that shape needed minimal structural changes. Mirrors
 * `use-image-upload.ts`.
 */
export function useDocumentUpload(
  folder: string,
  options: {
    onUploadComplete: (files: UploadedDocument[]) => void;
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
