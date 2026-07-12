"use client";

import type { SupplierDetail } from "@/features/suppliers/queries/get-supplier.query";
import {
  updateSupplierAction,
} from "@/features/suppliers/actions/supplier.action";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { SupplierDocumentManager } from "@/features/suppliers/components/supplier-document-manager";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  tenantSlug: string;
  supplier: SupplierDetail;
  canEdit: boolean;
};

export function SupplierEditTabs({ tenantId, tenantSlug, supplier, canEdit }: Props) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <SupplierForm
          mode="edit"
          tenantSlug={tenantSlug}
          supplier={supplier}
          onSubmit={(values) => updateSupplierAction(tenantId, supplier.id, values)}
        />
      </TabsContent>

      <TabsContent value="documents">
        <SupplierDocumentManager
          tenantId={tenantId}
          supplierId={supplier.id}
          documents={supplier.documents}
          canEdit={canEdit}
        />
      </TabsContent>
    </Tabs>
  );
}
