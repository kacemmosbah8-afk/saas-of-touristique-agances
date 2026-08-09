import { NextResponse } from "next/server";

import { requireSession, AuthError } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  uploadImage,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
} from "@/shared/lib/storage/supabase-provider";

/**
 * Generic authenticated image-upload endpoint backing every admin media
 * uploader (cover images, galleries, room-type photos, the agency logo).
 * Any signed-in member may upload — the resource-specific permission check
 * (e.g. "can this user edit this package?") happens separately, in the
 * server action that attaches the resulting URL to a record, exactly as it
 * did when uploads went through UploadThing. This endpoint only proves
 * "there's a valid session" and validates the file itself.
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
  if (!isAllowedImageType(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller.` },
      { status: 400 },
    );
  }

  try {
    const { key, url } = await uploadImage(file, folder);
    return NextResponse.json({ ok: true, data: { fileKey: key, url } });
  } catch (err) {
    logger.error("image upload failed", { error: err instanceof Error ? err.message : err });
    // Every throw site in `uploadImage` (missing config, bucket-create
    // failure, the Supabase API call itself) already produces a safe,
    // specific, non-sensitive message — surface it rather than flattening
    // every failure into a content-free "please try again" that hides the
    // real cause from the admin uploading the file, not just from logs.
    const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
