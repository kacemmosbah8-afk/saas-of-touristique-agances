import { NextResponse } from "next/server";

import { requireSession, AuthError } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  uploadDocument,
  isAllowedDocumentType,
  MAX_DOCUMENT_BYTES,
} from "@/shared/lib/storage/supabase-provider";

/**
 * Authenticated document-upload endpoint backing every admin document
 * uploader (traveller passports/visas, supplier contracts, generic tenant
 * documents) — the Supabase-backed replacement for the UploadThing
 * `documentFile`/`supplierDocument` endpoints, which never worked (no real
 * `UPLOADTHING_TOKEN` was ever configured). Mirrors `/api/upload-image`:
 * any signed-in member may upload here, with the resource-specific
 * permission check happening in the server action that attaches the
 * resulting URL to a record.
 */
export async function POST(request: Request) {
  try {
    await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }
  if (typeof folder !== "string" || !/^[a-z0-9-]+$/.test(folder)) {
    return NextResponse.json({ ok: false, error: "Invalid upload target." }, { status: 400 });
  }
  if (!isAllowedDocumentType(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unsupported file type. Allowed: PDF, Word, Excel, images, text, CSV, ZIP, or HTML.",
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { ok: false, error: `File must be ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB or smaller.` },
      { status: 400 },
    );
  }

  try {
    const { key, url } = await uploadDocument(file, folder);
    return NextResponse.json({ ok: true, data: { fileKey: key, url } });
  } catch (err) {
    logger.error("document upload failed", { error: err instanceof Error ? err.message : err });
    const message =
      err instanceof Error && err.message.includes("isn't configured yet")
        ? err.message
        : "Upload failed. Please try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
