"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Trash2, Upload } from "lucide-react";
import type { DocumentCategory } from "@prisma/client";

import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DOCUMENT_CATEGORIES,
} from "@/features/documents/schemas/document.schema";
import {
  createDocumentAction,
  deleteDocumentAction,
} from "@/features/documents/actions/document.action";
import { useDocumentUpload, DOCUMENT_ACCEPT } from "@/shared/lib/storage/use-document-upload";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** The categories that make sense for a traveller's paperwork. */
const TRAVELLER_DOC_CATEGORIES: readonly (typeof DOCUMENT_CATEGORIES)[number][] = [
  "PASSPORT",
  "VISA",
  "INSURANCE",
  "NATIONAL_ID",
  "VACCINATION",
  "OTHER",
];

type Props = {
  tenantId: string;
  travellerId: string;
  documents: DocumentSummary[];
  canEdit: boolean;
};

/**
 * A traveller's document scans. Reuses the generic Document model + actions
 * with `ownerType: "traveller"` — no traveller-specific storage exists.
 */
export function TravellerDocuments({ tenantId, travellerId, documents, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<DocumentCategory>("PASSPORT");
  const fileRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useDocumentUpload("traveller-documents", {
    onUploadComplete: (files) => {
      const file = files[0];
      if (!file) return;
      startTransition(async () => {
        const result = await createDocumentAction(tenantId, {
          name: file.name,
          category,
          fileKey: file.fileKey,
          url: file.url,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          ownerType: "traveller",
          ownerId: travellerId,
        });
        if (!result.ok) {
          toast.error(result.error ?? "Failed to save document.");
          return;
        }
        toast.success("Document uploaded.");
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function remove(documentId: string) {
    startTransition(async () => {
      const result = await deleteDocumentAction(tenantId, documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Document deleted.");
      router.refresh();
    });
  }

  const busy = isPending || isUploading;

  return (
    <div className="space-y-2">
      {documents.length > 0 && (
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 text-sm">
              <a
                href={doc.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 truncate hover:underline"
              >
                {doc.name}
                <ExternalLink className="size-3 shrink-0 opacity-50" />
              </a>
              <span className="text-muted-foreground shrink-0 text-xs">
                {DOCUMENT_CATEGORY_LABELS[doc.category]}
              </span>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-6 shrink-0"
                  disabled={busy}
                  onClick={() => remove(doc.id)}
                  aria-label="Delete document"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger className="h-8 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAVELLER_DOC_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1.5 size-3.5" />
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) startUpload([file]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {documents.length === 0 && !canEdit && (
        <p className="text-muted-foreground text-xs">No documents.</p>
      )}
    </div>
  );
}
