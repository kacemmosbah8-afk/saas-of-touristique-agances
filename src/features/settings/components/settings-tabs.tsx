"use client";

import type { ReactNode } from "react";

import type {
  WorkspaceSettings,
  TagItem,
  TravelCategoryItem,
  CustomFieldItem,
} from "@/features/settings/queries/settings.query";
import { WorkspaceSettingsForm } from "@/features/settings/components/workspace-settings-form";
import { PublicWebsiteSettingsForm } from "@/features/settings/components/public-website-settings-form";
import { TagManager } from "@/features/settings/components/tag-manager";
import { CategoryManager } from "@/features/settings/components/category-manager";
import { CustomFieldManager } from "@/features/settings/components/custom-field-manager";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  tenantSlug: string;
  settings: WorkspaceSettings;
  tags: TagItem[];
  categories: TravelCategoryItem[];
  customFields: CustomFieldItem[];
  canEdit: boolean;
  /** Server-rendered Team section (member list) passed through as a slot. */
  teamSlot: ReactNode;
};

export function SettingsTabs({
  tenantId,
  tenantSlug,
  settings,
  tags,
  categories,
  customFields,
  canEdit,
  teamSlot,
}: Props) {
  return (
    <Tabs defaultValue="website">
      <TabsList className="mb-6">
        <TabsTrigger value="website">Public Website</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="fields">Custom Fields</TabsTrigger>
      </TabsList>

      <TabsContent value="website">
        <PublicWebsiteSettingsForm
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          profile={settings.profile}
          canEdit={canEdit}
        />
      </TabsContent>

      <TabsContent value="team">{teamSlot}</TabsContent>

      <TabsContent value="workspace">
        <WorkspaceSettingsForm tenantId={tenantId} settings={settings} canEdit={canEdit} />
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
    </Tabs>
  );
}
