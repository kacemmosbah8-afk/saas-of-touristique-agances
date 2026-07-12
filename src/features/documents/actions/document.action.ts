"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  createDocumentSchema,
  updateDocumentSchema,
  replaceDocumentFileSchema,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type ReplaceDocumentFileInput,
} from "@/features/documents/schemas/document.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createDocumentAction(
  tenantId: string,
  input: CreateDocumentInput,
): Promise<ActionResult<{ documentId: string }>> {
  const { session, db } = await requirePermission(tenantId, "document", "create");

  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const document = await db.document.create({
    data: {
      tenantId,
      name: d.name,
      category: d.category,
      fileKey: d.fileKey,
      url: d.url,
      mimeType: d.mimeType ?? null,
      sizeBytes: d.sizeBytes ?? null,
      ownerType: d.ownerType ?? null,
      ownerId: d.ownerId ?? null,
      uploadedById: session.user.id,
      notes: emptyToNull(d.notes),
    },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "document",
    entityId: document.id,
    metadata: { name: d.name, category: d.category },
  });
  logger.info("document created", { tenantId, documentId: document.id });
  return { ok: true, data: { documentId: document.id } };
}

export async function updateDocumentAction(
  tenantId: string,
  documentId: string,
  input: UpdateDocumentInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "document", "update");

  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.document.update({
      where: { id: documentId, tenantId },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        notes: emptyToNull(parsed.data.notes),
      },
    });
  } catch {
    return { ok: false, error: "Document not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "document",
    entityId: documentId,
  });
  return { ok: true };
}

/** Replace the underlying file, keeping the same document record. */
export async function replaceDocumentFileAction(
  tenantId: string,
  documentId: string,
  input: ReplaceDocumentFileInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "document", "update");

  const parsed = replaceDocumentFileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid file." };

  try {
    await db.document.update({
      where: { id: documentId, tenantId },
      data: {
        fileKey: parsed.data.fileKey,
        url: parsed.data.url,
        mimeType: parsed.data.mimeType ?? null,
        sizeBytes: parsed.data.sizeBytes ?? null,
      },
    });
  } catch {
    return { ok: false, error: "Document not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "replace-file",
    entity: "document",
    entityId: documentId,
  });
  return { ok: true };
}

export async function deleteDocumentAction(
  tenantId: string,
  documentId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "document", "delete");

  try {
    await db.document.update({
      where: { id: documentId, tenantId },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { ok: false, error: "Document not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "document",
    entityId: documentId,
  });
  logger.info("document deleted", { tenantId, documentId });
  return { ok: true };
}
