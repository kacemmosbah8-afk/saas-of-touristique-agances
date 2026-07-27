"use client";

import type { SupplierDetail } from "@/features/suppliers/queries/get-supplier.query";
import {
  updateSupplierAction,
} from "@/features/suppliers/actions/supplier.action";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { SupplierDocumentManager } from "@/features/suppliers/components/supplier-document-manager";
import { SupplierContactManager } from "@/features/suppliers/components/supplier-contact-manager";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  supplier: SupplierDetail;
  canEdit: boolean;
  locale: Locale;
};

export function SupplierEditTabs({ tenantId, tenantSlug, supplier, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).suppliers;
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="contacts">{dict.tabContacts}</TabsTrigger>
        <TabsTrigger value="documents">{dict.tabDocuments}</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <SupplierForm
          mode="edit"
          tenantSlug={tenantSlug}
          supplier={supplier}
          onSubmit={(values) => updateSupplierAction(tenantId, supplier.id, values)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="contacts">
        <SupplierContactManager
          tenantId={tenantId}
          supplierId={supplier.id}
          contacts={supplier.contacts}
          canEdit={canEdit}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="documents">
        <SupplierDocumentManager
          tenantId={tenantId}
          supplierId={supplier.id}
          documents={supplier.documents}
          canEdit={canEdit}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
