import { notFound } from "next/navigation";
import { Suspense } from "react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listDocuments } from "@/features/documents/queries/list-documents.query";
import {
  listDocumentsFiltersSchema,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
} from "@/features/documents/schemas/document.schema";
import { DocumentManager } from "@/features/documents/components/document-manager";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";

export const metadata = { title: "Documents — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "document", "view");

  const filters = listDocumentsFiltersSchema.parse({
    search: raw.search,
    category: raw.category,
    sort: raw.sort,
    page: raw.page,
  });

  const result = await listDocuments(db, filters);

  const canCreate = can(membership.role, "document", "create");
  const canEdit = can(membership.role, "document", "update");
  const canDelete = can(membership.role, "document", "delete");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-muted-foreground text-sm">
          {result.total} document{result.total !== 1 ? "s" : ""} — passports, visas, invoices,
          contracts, and more
        </p>
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search documents…"
          filters={[
            {
              key: "category",
              allLabel: "All categories",
              options: DOCUMENT_CATEGORIES.map((c) => ({
                value: c,
                label: DOCUMENT_CATEGORY_LABELS[c],
              })),
            },
          ]}
        />
      </Suspense>

      <DocumentManager
        tenantId={tenant.id}
        documents={result.documents}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <Suspense>
        <DataPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          noun="document"
        />
      </Suspense>
    </div>
  );
}
