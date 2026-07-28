import { generateReactHelpers } from "@uploadthing/react";

import type { AppFileRouter } from "@/shared/lib/storage/file-router";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<AppFileRouter>();
