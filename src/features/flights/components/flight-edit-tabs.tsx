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
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  flight: FlightDetail;
  canEdit: boolean;
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

export function FlightEditTabs({
  tenantId,
  tenantSlug,
  flight,
  canEdit,
  canManage,
  canDelete,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).flights;
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="media">{dict.tabMedia}</TabsTrigger>
        <TabsTrigger value="status">{dict.tabStatus}</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <FlightForm
          mode="edit"
          tenantSlug={tenantSlug}
          flight={flight}
          onSubmit={(values) => updateFlightAction(tenantId, flight.id, values)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={flight.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateFlightCoverAction(tenantId, flight.id, input)}
          onRemove={() => deleteFlightCoverAction(tenantId, flight.id)}
          locale={locale}
        />
        <Separator />
        <GalleryUploader
          images={flight.images}
          canEdit={canEdit}
          onAdd={(input) => addFlightImageAction(tenantId, flight.id, input)}
          onDelete={(imageId) => deleteFlightImageAction(tenantId, imageId)}
          locale={locale}
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
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
