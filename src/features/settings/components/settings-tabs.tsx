"use client";

import type { ReactNode } from "react";

import type {
  WorkspaceSettings,
  TagItem,
  TravelCategoryItem,
  CustomFieldItem,
} from "@/features/settings/queries/settings.query";
import { WorkspaceSettingsForm } from "@/features/settings/components/workspace-settings-form";
import { PricingSettingsForm } from "@/features/pricing/components/pricing-settings-form";
import { TagManager } from "@/features/settings/components/tag-manager";
import { CategoryManager } from "@/features/settings/components/category-manager";
import { CustomFieldManager } from "@/features/settings/components/custom-field-manager";
import { CancellationPolicyManager } from "@/features/cancellations/components/cancellation-policy-manager";
import type { CancellationPolicyView } from "@/features/cancellations/queries/cancellation.query";
import { BillingPanel } from "@/features/billing/components/billing-panel";
import type { BillingSummary } from "@/features/billing/queries/get-billing-summary.query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  settings: WorkspaceSettings;
  tags: TagItem[];
  categories: TravelCategoryItem[];
  customFields: CustomFieldItem[];
  cancellationPolicies: CancellationPolicyView[];
  canEdit: boolean;
  /** Server-rendered Team section (member list) passed through as a slot. */
  teamSlot: ReactNode;
  billingSummary: BillingSummary | null;
  canManageBilling: boolean;
};

export function SettingsTabs({
  tenantId,
  settings,
  tags,
  categories,
  customFields,
  cancellationPolicies,
  canEdit,
  teamSlot,
  billingSummary,
  canManageBilling,
}: Props) {
  return (
    <Tabs defaultValue="team">
      <TabsList className="mb-6">
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="fields">Custom Fields</TabsTrigger>
        <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
      </TabsList>

      <TabsContent value="team">{teamSlot}</TabsContent>

      <TabsContent value="billing">
        {billingSummary ? (
          <BillingPanel tenantId={tenantId} summary={billingSummary} canManage={canManageBilling} />
        ) : (
          <p className="text-muted-foreground text-sm">No subscription found for this workspace.</p>
        )}
      </TabsContent>

      <TabsContent value="workspace">
        <WorkspaceSettingsForm tenantId={tenantId} settings={settings} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="pricing">
        <PricingSettingsForm tenantId={tenantId} settings={settings.pricing} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="tags">
        <TagManager tenantId={tenantId} tags={tags} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="categories">
        <CategoryManager tenantId={tenantId} categories={categories} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="fields">
        <CustomFieldManager tenantId={tenantId} fields={customFields} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="cancellation">
        <CancellationPolicyManager
          tenantId={tenantId}
          policies={cancellationPolicies}
          canEdit={canEdit}
        />
      </TabsContent>
    </Tabs>
  );
}
