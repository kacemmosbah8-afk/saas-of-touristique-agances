import "server-only";

import { supabaseStorageProvider } from "@/shared/lib/storage/supabase-provider";

/**
 * The active image storage adapter (cover images, galleries, agency logo).
 * Every image-resource consumer imports `storage` from here — never a
 * concrete provider — so changing providers is a one-line edit. Document
 * uploads (traveller/supplier PDFs) are a separate, non-public-URL
 * sensitivity class and stay on UploadThing directly — see PROJECT.md.
 */
export const storage = supabaseStorageProvider;

export type { StorageProvider, StoredFile } from "@/shared/lib/storage/types";
