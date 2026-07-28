"use client";

import type { HotelDetail } from "@/features/hotels/queries/get-hotel.query";
import { updateHotelAction } from "@/features/hotels/actions/update-hotel.action";
import {
  updateHotelCoverAction,
  deleteHotelCoverAction,
  addHotelImageAction,
  deleteHotelImageAction,
} from "@/features/hotels/actions/hotel-media.action";
import { HotelForm } from "@/features/hotels/components/hotel-form";
import { RoomTypeManager } from "@/features/hotels/components/room-type-manager";
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
  hotel: HotelDetail;
  canEdit: boolean;
  locale: Locale;
};

export function HotelEditTabs({ tenantId, tenantSlug, hotel, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).hotels;
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">{dict.tabDetails}</TabsTrigger>
        <TabsTrigger value="media">{dict.tabMedia}</TabsTrigger>
        <TabsTrigger value="rooms">{dict.tabRooms}</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <HotelForm
          mode="edit"
          tenantSlug={tenantSlug}
          hotel={hotel}
          onSubmit={(values) => updateHotelAction(tenantId, hotel.id, values)}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={hotel.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateHotelCoverAction(tenantId, hotel.id, input)}
          onRemove={() => deleteHotelCoverAction(tenantId, hotel.id)}
          description={dict.coverImageDescription}
          locale={locale}
        />
        <Separator />
        <GalleryUploader
          images={hotel.images}
          canEdit={canEdit}
          onAdd={(input) => addHotelImageAction(tenantId, hotel.id, input)}
          onDelete={(imageId) => deleteHotelImageAction(tenantId, imageId)}
          description={dict.galleryDescription}
          locale={locale}
        />
      </TabsContent>

      <TabsContent value="rooms">
        <RoomTypeManager
          tenantId={tenantId}
          hotelId={hotel.id}
          roomTypes={hotel.roomTypes}
          canEdit={canEdit}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  );
}
