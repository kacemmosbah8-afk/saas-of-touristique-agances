"use client";

import type { CustomerDetail } from "@/features/crm/queries/get-customer.query";
import type { MemberOption, TagOption } from "@/features/crm/queries/crm-options.query";
import { updateCustomerAction } from "@/features/crm/actions/customer.action";
import { CustomerForm } from "@/features/crm/components/customer-form";
import { CustomerContacts } from "@/features/crm/components/customer-contacts";
import { CustomerAddresses } from "@/features/crm/components/customer-addresses";
import { CustomerNotes } from "@/features/crm/components/customer-notes";
import { CustomerTimeline } from "@/features/crm/components/customer-timeline";
import { CustomerTags } from "@/features/crm/components/customer-tags";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customer: CustomerDetail;
  members: MemberOption[];
  availableTags: TagOption[];
  canEdit: boolean;
};

export function CustomerDetailTabs({
  tenantId,
  tenantSlug,
  customer,
  members,
  availableTags,
  canEdit,
}: Props) {
  return (
    <div className="space-y-6">
      <CustomerTags
        tenantId={tenantId}
        customerId={customer.id}
        tags={customer.tags}
        availableTags={availableTags}
        canEdit={canEdit}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Notes" value={customer.stats.notes} />
        <StatCard label="Activities" value={customer.stats.activities} />
        <StatCard label="Leads" value={customer.stats.leads} />
        <StatCard label="Customer for" value={`${customer.stats.ageDays}d`} />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contacts">Contacts &amp; Addresses</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {canEdit ? (
            <CustomerForm
              mode="edit"
              tenantId={tenantId}
              tenantSlug={tenantSlug}
              customer={customer}
              members={members}
              onSubmit={(values) => updateCustomerAction(tenantId, customer.id, values)}
            />
          ) : (
            <ReadOnlyProfile customer={customer} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-8">
          <CustomerContacts
            tenantId={tenantId}
            customerId={customer.id}
            contacts={customer.contacts}
            canEdit={canEdit}
          />
          <Separator />
          <CustomerAddresses
            tenantId={tenantId}
            customerId={customer.id}
            addresses={customer.addresses}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="notes">
          <CustomerNotes
            tenantId={tenantId}
            customerId={customer.id}
            notes={customer.customerNotes}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <CustomerTimeline items={customer.timeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function ReadOnlyProfile({ customer }: { customer: CustomerDetail }) {
  const rows: [string, string | null][] = [
    ["Email", customer.email],
    ["Phone", customer.phone],
    ["Nationality", customer.nationality],
    ["Passport", customer.passportNumber],
    ["Notes", customer.notes],
  ];
  return (
    <div className="space-y-4 text-sm">
      {rows
        .filter(([, v]) => v)
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {label}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
          </div>
        ))}
    </div>
  );
}
