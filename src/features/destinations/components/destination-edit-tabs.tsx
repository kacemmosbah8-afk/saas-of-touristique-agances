"use client";

import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";
import {
  updateDestinationAction,
  updateDestinationSeoAction,
  updateDestinationCoverAction,
  deleteDestinationCoverAction,
  addDestinationImageAction,
  deleteDestinationImageAction,
} from "@/features/destinations/actions/destination.action";
import { DestinationDetailsForm } from "@/features/destinations/components/destination-details-form";
import { DestinationSeoForm } from "@/features/destinations/components/destination-seo-form";
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
  destination: DestinationDetail;
  canEdit: boolean;
};

export function DestinationEditTabs({ tenantId, tenantSlug, destination, canEdit }: Props) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <DestinationDetailsForm
          mode="edit"
          tenantSlug={tenantSlug}
          destination={destination}
          onSubmit={(values) => updateDestinationAction(tenantId, destination.id, values)}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={destination.heroImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateDestinationCoverAction(tenantId, destination.id, input)}
          onRemove={() => deleteDestinationCoverAction(tenantId, destination.id)}
          title="Hero Image"
          description="Large banner image for the destination. Recommended: 1600×600px."
          aspectClassName="aspect-[1600/600]"
        />
        <Separator />
        <GalleryUploader
          images={destination.gallery}
          canEdit={canEdit}
          onAdd={(input) => addDestinationImageAction(tenantId, destination.id, input)}
          onDelete={(imageId) => deleteDestinationImageAction(tenantId, imageId)}
        />
      </TabsContent>

      <TabsContent value="seo">
        <DestinationSeoForm
          tenantId={tenantId}
          destination={destination}
          onSubmit={(values) => updateDestinationSeoAction(tenantId, destination.id, values)}
        />
      </TabsContent>
    </Tabs>
  );
}
