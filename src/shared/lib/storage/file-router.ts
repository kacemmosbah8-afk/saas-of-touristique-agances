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

  packageCover: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key, url: file.ufsUrl };
    }),

  packageGallery: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key, url: file.ufsUrl };
    }),

  // Generic single cover/hero image for M2 resources (hotels, activities,
  // destinations).
  resourceCover: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key, url: file.ufsUrl };
    }),

  // Generic multi-image gallery for M2 resources.
  resourceGallery: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await requireSession();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, key: file.key, url: file.ufsUrl };
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
