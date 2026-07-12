import { createUploadthing, type FileRouter } from "uploadthing/next";

import { requireSession } from "@/shared/lib/permissions/guard";

const f = createUploadthing();

/**
 * UploadThing file routes. No business module owns a route yet — this is a
 * single generic authenticated route so the upload pipeline (auth ->
 * upload -> storage adapter) is provably wired end to end in M0. Feature
 * milestones (documents, itineraries, ...) will add their own typed routes
 * here (e.g. `passportScan`, `itineraryCover`) with tenant-aware middleware.
 */
export const fileRouter = {
  attachment: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
