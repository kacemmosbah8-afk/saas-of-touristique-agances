"use client";

import type { FlightDetail } from "@/features/flights/queries/get-flight.query";
import { updateFlightAction } from "@/features/flights/actions/create-flight.action";
import {
  updateFlightCoverAction,
  deleteFlightCoverAction,
  addFlightImageAction,
  deleteFlightImageAction,
} from "@/features/flights/actions/flight-media.action";
import { FlightForm } from "@/features/flights/components/flight-form";
import { FlightStatusActions } from "@/features/flights/components/flight-status-actions";
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
  flight: FlightDetail;
  canEdit: boolean;
  canManage: boolean;
  canDelete: boolean;
};

export function FlightEditTabs({ tenantId, tenantSlug, flight, canEdit, canManage, canDelete }: Props) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="status">Status</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <FlightForm
          mode="edit"
          tenantSlug={tenantSlug}
          flight={flight}
          onSubmit={(values) => updateFlightAction(tenantId, flight.id, values)}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={flight.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateFlightCoverAction(tenantId, flight.id, input)}
          onRemove={() => deleteFlightCoverAction(tenantId, flight.id)}
        />
        <Separator />
        <GalleryUploader
          images={flight.images}
          canEdit={canEdit}
          onAdd={(input) => addFlightImageAction(tenantId, flight.id, input)}
          onDelete={(imageId) => deleteFlightImageAction(tenantId, imageId)}
        />
      </TabsContent>

      <TabsContent value="status">
        <FlightStatusActions
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          flightId={flight.id}
          status={flight.status}
          canManage={canManage}
          canDelete={canDelete}
        />
      </TabsContent>
    </Tabs>
  );
}
