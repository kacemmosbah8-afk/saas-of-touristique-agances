"use client";

import dynamic from "next/dynamic";

import type { FlightDetail } from "@/features/flights/queries/get-flight.query";
import { updateFlightAction } from "@/features/flights/actions/create-flight.action";
import {
  updateFlightCoverAction,
  deleteFlightCoverAction,
  addFlightImageAction,
  deleteFlightImageAction,
} from "@/features/flights/actions/flight-media.action";
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
import { getFlightsDict } from "@/shared/i18n/admin-dictionary/flights";

type Props = {
  tenantId: string;
  tenantSlug: string;
  flight: FlightDetail;
  canEdit: boolean;
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

const FlightForm = dynamic(
  () => import("@/features/flights/components/flight-form").then((m) => m.FlightForm),
  { ssr: true, loading: () => <div className="bg-muted h-64 w-full animate-pulse rounded-lg" /> },
);

export function FlightEditTabs({
  tenantId,
  tenantSlug,
  flight,
  canEdit,
  canManage,
  canDelete,
  locale,
}: Props) {
  const dict = getFlightsDict(locale);
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="media">{dict.tabMedia}</TabsTrigger>
        <TabsTrigger value="status">{dict.tabStatus}</TabsTrigger>
      </TabsList>

      {/* forceMount: keep the wizard mounted across tab switches — Radix
          unmounts inactive TabsContent by default, which was tearing down
          and rebuilding this whole multi-step form (full useForm re-init,
          all effects resubscribing) every time the user came back to this
          tab, on top of re-triggering the dynamic-import Suspense boundary. */}
      <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
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
