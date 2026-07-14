"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  FileImage,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import type { DocumentCategory } from "@prisma/client";

import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
} from "@/features/documents/schemas/document.schema";
import {
  createDocumentAction,
  updateDocumentAction,
  replaceDocumentFileAction,
  deleteDocumentAction,
} from "@/features/documents/actions/document.action";
import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  tenantId: string;
  documents: DocumentSummary[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function DocumentManager({ tenantId, documents, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("OTHER");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<DocumentCategory>("OTHER");
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const { startUpload, isUploading } = useUploadThing("documentFile", {
    onClientUploadComplete: (res) => {
      const file = res[0];
      if (!file) return;
      startTransition(async () => {
        const result = await createDocumentAction(tenantId, {
          name: file.name,
          category: uploadCategory,
          fileKey: file.key,
          url: file.ufsUrl,
          mimeType: file.type,
          sizeBytes: file.size,
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

  const { startUpload: startReplaceUpload, isUploading: isReplacing } = useUploadThing(
    "documentFile",
    {
      onClientUploadComplete: (res) => {
        const file = res[0];
        const documentId = replaceTargetRef.current;
        replaceTargetRef.current = null;
        if (!file || !documentId) return;
        startTransition(async () => {
          const result = await replaceDocumentFileAction(tenantId, documentId, {
            fileKey: file.key,
            url: file.ufsUrl,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          if (!result.ok) {
            toast.error(result.error ?? "Failed to replace file.");
            return;
          }
          toast.success("File replaced.");
          router.refresh();
        });
      },
      onUploadError: (err) => {
        replaceTargetRef.current = null;
        toast.error(`Upload failed: ${err.message}`);
      },
    },
  );

  function startEdit(doc: DocumentSummary) {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditCategory(doc.category);
  }

  function saveEdit() {
    const documentId = editingId;
    if (!documentId || !editName.trim()) return;
    startTransition(async () => {
      const result = await updateDocumentAction(tenantId, documentId, {
        name: editName.trim(),
        category: editCategory,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditingId(null);
      toast.success("Document updated.");
      router.refresh();
    });
  }

  async function remove(documentId: string) {
    if (!(await confirm({ title: "Delete this document?", destructive: true }))) return;
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

  const isBusy = isPending || isUploading || isReplacing;

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={uploadCategory}
            onValueChange={(v) => setUploadCategory(v as DocumentCategory)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={isBusy}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload className="mr-1.5 size-4" />
            {isUploading ? "Uploading…" : "Upload Document"}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FileText className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">No documents match your filters.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              {doc.mimeType?.startsWith("image/") ? (
                <FileImage className="text-muted-foreground size-4 shrink-0" />
              ) : (
                <FileText className="text-muted-foreground size-4 shrink-0" />
              )}

              {editingId === doc.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 max-w-xs"
                    disabled={isBusy}
                  />
                  <Select
                    value={editCategory}
                    onValueChange={(v) => setEditCategory(v as DocumentCategory)}
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {DOCUMENT_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={saveEdit} disabled={isBusy || !editName.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 truncate font-medium hover:underline"
                  >
                    {doc.name}
                    <ExternalLink className="size-3 shrink-0 opacity-50" />
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    {doc.sizeBytes != null && ` · ${formatSize(doc.sizeBytes)}`} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {editingId !== doc.id && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {canEdit && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={isBusy}
                        onClick={() => startEdit(doc)}
                        aria-label="Rename / recategorize"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={isBusy}
                        onClick={() => {
                          replaceTargetRef.current = doc.id;
                          replaceRef.current?.click();
                        }}
                        aria-label="Replace file"
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      disabled={isBusy}
                      onClick={() => remove(doc.id)}
                      aria-label="Delete document"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        ref={uploadRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startUpload([file]);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startReplaceUpload([file]);
          e.target.value = "";
        }}
      />
      {confirmDialog}
    </div>
  );
}
