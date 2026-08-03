"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";

import type { SupplierDocumentItem } from "@/features/suppliers/queries/get-supplier.query";
import {
  addSupplierDocumentAction,
  deleteSupplierDocumentAction,
} from "@/features/suppliers/actions/supplier.action";
import { useDocumentUpload, DOCUMENT_ACCEPT } from "@/shared/lib/storage/use-document-upload";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  supplierId: string;
  documents: SupplierDocumentItem[];
  canEdit: boolean;
  locale: Locale;
};

export function SupplierDocumentManager({
  tenantId,
  supplierId,
  documents,
  canEdit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).suppliers.documents;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<"contract" | "document">("document");
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useDocumentUpload("supplier-documents", {
    onUploadComplete: (files) => {
      const file = files[0];
      if (!file) return;
      startTransition(async () => {
        const result = await addSupplierDocumentAction(tenantId, supplierId, {
          name: file.name,
          kind,
          fileKey: file.fileKey,
          url: file.url,
        });
        if (!result.ok) {
          toast.error(result.error ?? dict.failedToSave);
          return;
        }
        toast.success(dict.added);
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`${dict.uploadFailedPrefix} ${err.message}`);
    },
  });

  function remove(documentId: string) {
    startTransition(async () => {
      const result = await deleteSupplierDocumentAction(tenantId, documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.removed);
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{dict.heading}</h3>
        <p className="text-muted-foreground text-sm">{dict.subtitle}</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as "contract" | "document")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="document">{dict.kindDocument}</SelectItem>
              <SelectItem value="contract">{dict.kindContract}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="me-1.5 size-4" />
            {isUploading ? dict.uploading : dict.upload}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState title={dict.noDocuments} className="rounded-lg py-8" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={doc.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-medium hover:underline"
                >
                  {doc.name}
                </a>
                <p className="text-muted-foreground text-xs capitalize">
                  {doc.kind} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-7"
                  disabled={isLoading}
                  onClick={() => remove(doc.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
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
  );
}
