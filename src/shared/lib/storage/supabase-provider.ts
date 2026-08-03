import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";
import type { StorageProvider } from "@/shared/lib/storage/types";

// Constructed lazily (not at module load) so importing this file never
// requires the Supabase env vars to be set — only actually uploading or
// deleting does, mirroring the UploadThing adapter's own lazy-client
// pattern (see uploadthing-provider.ts, still used for documents).
let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Image storage isn't configured yet — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}

const BUCKET = env.SUPABASE_STORAGE_BUCKET;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, matching the old per-file UploadThing limit
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type);
}

function publicUrlFor(bucket: string, key: string): string {
  const { data } = getClient().storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Uploads one image to the bucket under `folder/`, creating the bucket
 * (public, image-only, size-capped) on first use if it doesn't exist yet —
 * so there's no manual Supabase dashboard setup step beyond having a
 * project and a service role key.
 */
export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ key: string; url: string }> {
  const supabase = getClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  let { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error && /bucket.*not.*found/i.test(error.message)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_IMAGE_TYPES),
    });
    // Ignore "already exists" — a concurrent request may have created it first.
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Could not create storage bucket: ${createError.message}`);
    }
    ({ error } = await supabase.storage.from(BUCKET).upload(key, file, {
      contentType: file.type,
      upsert: false,
    }));
  }

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { key, url: publicUrlFor(BUCKET, key) };
}

export const supabaseStorageProvider: StorageProvider = {
  async delete(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (list.length === 0) return;
    const { error } = await getClient().storage.from(BUCKET).remove(list);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  },
  getUrl(key) {
    return publicUrlFor(BUCKET, key);
  },
};

const DOCUMENTS_BUCKET = "documents";

// 16MB, matching the larger of the two old UploadThing document caps
// (documentFile's PDF/image limit; supplierDocument capped images at 8MB).
export const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;

// Deliberately broader than images — covers what a travel agency actually
// attaches (passports, visas, contracts, spreadsheets) — but still an
// allowlist, not "any file," to keep out executables/scripts. HTML is
// included per product decision, but every object is uploaded with
// `Content-Disposition: attachment` below so opening one always downloads
// it instead of rendering/executing it in the browser.
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "text/html",
]);

export function isAllowedDocumentType(type: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.has(type);
}

/**
 * Uploads one document (passport/visa/contract/etc.) to a separate bucket
 * from images, so its broader MIME allowlist never loosens what the image
 * bucket accepts. See `ALLOWED_DOCUMENT_TYPES` for why `Content-Disposition`
 * is forced on every object.
 */
export async function uploadDocument(
  file: File,
  folder: string,
): Promise<{ key: string; url: string }> {
  const supabase = getClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  const uploadOptions = {
    contentType: file.type,
    upsert: false,
    headers: {
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  };

  let { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(key, file, uploadOptions);

  if (error && /bucket.*not.*found/i.test(error.message)) {
    const { error: createError } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_DOCUMENT_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_DOCUMENT_TYPES),
    });
    // Ignore "already exists" — a concurrent request may have created it first.
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Could not create storage bucket: ${createError.message}`);
    }
    ({ error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(key, file, uploadOptions));
  }

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { key, url: publicUrlFor(DOCUMENTS_BUCKET, key) };
}
