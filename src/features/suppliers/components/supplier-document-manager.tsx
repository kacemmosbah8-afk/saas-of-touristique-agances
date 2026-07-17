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
import { useUploadThing } from "@/shared/lib/storage/uploadthing-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  supplierId: string;
  documents: SupplierDocumentItem[];
  canEdit: boolean;
};

export function SupplierDocumentManager({ tenantId, supplierId, documents, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<"contract" | "document">("document");
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("supplierDocument", {
    onClientUploadComplete: (res) => {
      const file = res[0];
      if (!file) return;
      startTransition(async () => {
        const result = await addSupplierDocumentAction(tenantId, supplierId, {
          name: file.name,
          kind,
          fileKey: file.key,
          url: file.ufsUrl,
        });
        if (!result.ok) {
          toast.error(result.error ?? "Failed to save document.");
          return;
        }
        toast.success("Document added.");
        router.refresh();
      });
    },
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  function remove(documentId: string) {
    startTransition(async () => {
      const result = await deleteSupplierDocumentAction(tenantId, documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Document removed.");
      router.refresh();
    });
  }

  const isLoading = isUploading || isPending;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Documents &amp; Contracts</h3>
        <p className="text-muted-foreground text-sm">
          Store contracts and other files (PDF or image, up to 16MB).
        </p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as "contract" | "document")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 size-4" />
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState title="No documents yet." className="rounded-lg py-8" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={doc.url}
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
        accept="application/pdf,image/*"
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
