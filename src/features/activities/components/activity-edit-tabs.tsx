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

type Props = {
  tenantId: string;
  tenantSlug: string;
  activity: ActivityDetail;
  suppliers: SupplierOption[];
  canEdit: boolean;
};

export function ActivityEditTabs({ tenantId, tenantSlug, activity, suppliers, canEdit }: Props) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <ActivityCatalogForm
          mode="edit"
          tenantSlug={tenantSlug}
          activity={activity}
          suppliers={suppliers}
          onSubmit={(values) => updateActivityCatalogAction(tenantId, activity.id, values)}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={activity.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateActivityCoverAction(tenantId, activity.id, input)}
          onRemove={() => deleteActivityCoverAction(tenantId, activity.id)}
        />
        <Separator />
        <GalleryUploader
          images={activity.images}
          canEdit={canEdit}
          onAdd={(input) => addActivityImageAction(tenantId, activity.id, input)}
          onDelete={(imageId) => deleteActivityImageAction(tenantId, imageId)}
        />
      </TabsContent>
    </Tabs>
  );
}
