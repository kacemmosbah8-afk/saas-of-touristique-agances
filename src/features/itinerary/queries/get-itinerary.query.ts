import type { TenantDb } from "@/shared/lib/db";

export type ItineraryActivityItem = {
  id: string;
  position: number;
  title: string;
  titleFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  duration: number | null;
};

export type ItineraryDayItem = {
  id: string;
  dayNumber: number;
  title: string;
  titleFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  notes: string | null;
  mealBreakfast: string | null;
  mealBreakfastFr: string | null;
  mealLunch: string | null;
  mealLunchFr: string | null;
  mealDinner: string | null;
  mealDinnerFr: string | null;
  transferNotes: string | null;
  transferNotesFr: string | null;
  accommodationNotes: string | null;
  accommodationNotesFr: string | null;
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
      titleFr: true,
      description: true,
      descriptionFr: true,
      notes: true,
      mealBreakfast: true,
      mealBreakfastFr: true,
      mealLunch: true,
      mealLunchFr: true,
      mealDinner: true,
      mealDinnerFr: true,
      transferNotes: true,
      transferNotesFr: true,
      accommodationNotes: true,
      accommodationNotesFr: true,
      activities: {
        select: {
          id: true,
          position: true,
          title: true,
          titleFr: true,
          description: true,
          descriptionFr: true,
          duration: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { dayNumber: "asc" },
  });
}
