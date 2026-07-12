import "server-only";

import { uploadThingProvider } from "@/shared/lib/storage/uploadthing-provider";

/**
 * The active storage adapter. Every consumer imports `storage` from here —
 * never a concrete provider — so changing providers is a one-line edit.
 * See PROJECT.md ("File storage") for why UploadThing is the default and
 * when to switch to the R2/S3 adapter.
 */
export const storage = uploadThingProvider;

export type { StorageProvider, StoredFile } from "@/shared/lib/storage/types";
