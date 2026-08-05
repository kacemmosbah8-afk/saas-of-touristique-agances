"use client";

import type { ActivityDetail } from "@/features/activities/queries/get-activity.query";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";
import { updateActivityCatalogAction } from "@/features/activities/actions/activity.action";
import {
  updateActivityCoverAction,
  deleteActivityCoverAction,
  addActivityImageAction,
  deleteActivityImageAction,
} from "@/features/activities/actions/activity-media.action";
import { ActivityCatalogForm } from "@/features/activities/components/activity-catalog-form";
import { CoverImageUploader } from "@/shared/components/media/cover-image-uploader";
import { GalleryUploader } from "@/shared/components/media/gallery-uploader";
import { Separator } from "@/shared/components/ui/separator";
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
  activity: ActivityDetail;
  suppliers: SupplierOption[];
  canEdit: boolean;
  locale: Locale;
};

export function ActivityEditTabs({
  tenantId,
  tenantSlug,
  activity,
  suppliers,
  canEdit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).activities;
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="media">{dict.tabMedia}</TabsTrigger>
      </TabsList>

      {/* forceMount: keep the wizard mounted across tab switches — Radix
          unmounts inactive TabsContent by default, which would tear down
          and rebuild this whole multi-step form (full useForm re-init, all
          effects resubscribing) every time the user came back to this tab. */}
      <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
        <ActivityCatalogForm
          mode="edit"
          tenantSlug={tenantSlug}
          activity={activity}
          suppliers={suppliers}
          onSubmit={(values) => updateActivityCatalogAction(tenantId, activity.id, values)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={activity.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateActivityCoverAction(tenantId, activity.id, input)}
          onRemove={() => deleteActivityCoverAction(tenantId, activity.id)}
          locale={locale}
        />
        <Separator />
        <GalleryUploader
          images={activity.images}
          canEdit={canEdit}
          onAdd={(input) => addActivityImageAction(tenantId, activity.id, input)}
          onDelete={(imageId) => deleteActivityImageAction(tenantId, imageId)}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
