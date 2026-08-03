"use client";

import dynamic from "next/dynamic";

import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";
import {
  updateDestinationAction,
  updateDestinationSeoAction,
  updateDestinationCoverAction,
  deleteDestinationCoverAction,
  addDestinationImageAction,
  deleteDestinationImageAction,
} from "@/features/destinations/actions/destination.action";
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
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

/** Lightweight placeholder shown while the wizard's JS chunk streams in. */
function DestinationFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-lg border p-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="bg-muted h-4 w-24 rounded" />
          <div className="bg-muted h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

const DestinationDetailsForm = dynamic(
  () => import("@/features/destinations/components/destination-form").then((m) => m.DestinationDetailsForm),
  { loading: () => <DestinationFormSkeleton />, ssr: true },
);

type Props = {
  tenantId: string;
  tenantSlug: string;
  destination: DestinationDetail;
  canEdit: boolean;
  locale: Locale;
};

export function DestinationEditTabs({
  tenantId,
  tenantSlug,
  destination,
  canEdit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).destinations;
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="media">{dict.tabMedia}</TabsTrigger>
        <TabsTrigger value="seo">{dict.tabSeo}</TabsTrigger>
      </TabsList>

      {/* forceMount: keep the wizard mounted across tab switches — Radix
          unmounts inactive TabsContent by default, which was tearing down
          and rebuilding this whole multi-step form (full useForm re-init,
          all effects resubscribing) every time the user came back to this
          tab, on top of re-triggering the dynamic-import Suspense boundary. */}
      <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
        <DestinationDetailsForm
          mode="edit"
          tenantSlug={tenantSlug}
          destination={destination}
          onSubmit={(values) => updateDestinationAction(tenantId, destination.id, values)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={destination.heroImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateDestinationCoverAction(tenantId, destination.id, input)}
          onRemove={() => deleteDestinationCoverAction(tenantId, destination.id)}
          title={dict.heroImageTitle}
          description={dict.heroImageDescription}
          aspectClassName="aspect-[1600/600]"
          locale={locale}
        />
        <Separator />
        <GalleryUploader
          images={destination.gallery}
          canEdit={canEdit}
          onAdd={(input) => addDestinationImageAction(tenantId, destination.id, input)}
          onDelete={(imageId) => deleteDestinationImageAction(tenantId, imageId)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="seo">
        <DestinationSeoForm
          tenantId={tenantId}
          destination={destination}
          onSubmit={(values) => updateDestinationSeoAction(tenantId, destination.id, values)}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
