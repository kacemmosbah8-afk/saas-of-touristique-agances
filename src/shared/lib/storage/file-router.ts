import { createUploadthing, type FileRouter } from "uploadthing/next";

import { requireSession } from "@/shared/lib/permissions/guard";

const f = createUploadthing();

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

  // Cover images, galleries, and the agency logo moved to Supabase Storage
  // (see shared/lib/storage/supabase-provider.ts and
  // app/api/upload-image/route.ts) — always-public image URLs, unlike the
  // document types below. UploadThing stays for documents only.

  // Generic tenant document storage (passports, visas, contracts).
  documentFile: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
      };
    }),

  // Supplier contracts and other documents (PDF or image).
  supplierDocument: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
      };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
