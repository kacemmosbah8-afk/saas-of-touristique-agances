import { createRouteHandler } from "uploadthing/next";

import { fileRouter } from "@/shared/lib/storage/file-router";

export const { GET, POST } = createRouteHandler({
  router: fileRouter,
});
