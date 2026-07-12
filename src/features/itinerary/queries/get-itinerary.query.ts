import type { TenantDb } from "@/shared/lib/db";

export type ItineraryActivityItem = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  duration: number | null;
};

export type ItineraryDayItem = {
  id: string;
  dayNumber: number;
  title: string;
  description: string | null;
  notes: string | null;
  mealBreakfast: string | null;
  mealLunch: string | null;
  mealDinner: string | null;
  transferNotes: string | null;
  accommodationNotes: string | null;
  activities: ItineraryActivityItem[];
};

export async function getItinerary(
  db: TenantDb,
  packageId: string,
): Promise<ItineraryDayItem[]> {
  return db.itineraryDay.findMany({
    where: { packageId },
    select: {
      id: true,
      dayNumber: true,
      title: true,
      description: true,
      notes: true,
      mealBreakfast: true,
      mealLunch: true,
      mealDinner: true,
      transferNotes: true,
      accommodationNotes: true,
      activities: {
        select: {
          id: true,
          position: true,
          title: true,
          description: true,
          duration: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { dayNumber: "asc" },
  });
}
