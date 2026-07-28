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

function publicUrlFor(key: string): string {
  const { data } = getClient().storage.from(BUCKET).getPublicUrl(key);
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

  return { key, url: publicUrlFor(key) };
}

export const supabaseStorageProvider: StorageProvider = {
  async delete(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (list.length === 0) return;
    const { error } = await getClient().storage.from(BUCKET).remove(list);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  },
  getUrl(key) {
    return publicUrlFor(key);
  },
};
