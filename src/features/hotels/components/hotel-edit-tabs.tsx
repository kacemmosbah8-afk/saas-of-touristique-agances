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

type Props = {
  tenantId: string;
  tenantSlug: string;
  hotel: HotelDetail;
  canEdit: boolean;
};

export function HotelEditTabs({ tenantId, tenantSlug, hotel, canEdit }: Props) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="rooms">Room Types</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <HotelForm
          mode="edit"
          tenantSlug={tenantSlug}
          hotel={hotel}
          onSubmit={(values) => updateHotelAction(tenantId, hotel.id, values)}
        />
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <CoverImageUploader
          imageUrl={hotel.coverImageUrl}
          canEdit={canEdit}
          onUpload={(input) => updateHotelCoverAction(tenantId, hotel.id, input)}
          onRemove={() => deleteHotelCoverAction(tenantId, hotel.id)}
          description="Primary photo shown in listings. Recommended: 1200×630px."
        />
        <Separator />
        <GalleryUploader
          images={hotel.images}
          canEdit={canEdit}
          onAdd={(input) => addHotelImageAction(tenantId, hotel.id, input)}
          onDelete={(imageId) => deleteHotelImageAction(tenantId, imageId)}
          description="Up to 10 photos of the property."
        />
      </TabsContent>

      <TabsContent value="rooms">
        <RoomTypeManager
          tenantId={tenantId}
          hotelId={hotel.id}
          roomTypes={hotel.roomTypes}
          canEdit={canEdit}
        />
      </TabsContent>
    </Tabs>
  );
}
