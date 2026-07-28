import "server-only";
import { UTApi } from "uploadthing/server";

import type { StorageProvider } from "@/shared/lib/storage/types";

// Constructed lazily (not at module load) so importing this file never
// requires UPLOADTHING_TOKEN to be set — only actually calling delete()
// does. Keeps local dev / builds working without the token configured.
let client: UTApi | undefined;
function getClient(): UTApi {
  client ??= new UTApi();
  return client;
}

export const uploadThingProvider: StorageProvider = {
  async delete(keys) {
    await getClient().deleteFiles(keys);
  },
  getUrl(key) {
    return `https://utfs.io/f/${key}`;
  },
};
