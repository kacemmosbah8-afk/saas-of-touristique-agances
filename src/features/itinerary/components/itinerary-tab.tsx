"use client";

import type { ItineraryDayItem } from "@/features/itinerary/queries/get-itinerary.query";
import { createItineraryDayAction } from "@/features/itinerary/actions/create-itinerary-day.action";
import { updateItineraryDayAction } from "@/features/itinerary/actions/update-itinerary-day.action";
import { deleteItineraryDayAction } from "@/features/itinerary/actions/delete-itinerary-day.action";
import { reorderItineraryDaysAction } from "@/features/itinerary/actions/reorder-itinerary-days.action";
import { createActivityAction } from "@/features/itinerary/actions/create-activity.action";
import { updateActivityAction } from "@/features/itinerary/actions/update-activity.action";
import { deleteActivityAction } from "@/features/itinerary/actions/delete-activity.action";
import { reorderActivitiesAction } from "@/features/itinerary/actions/reorder-activities.action";
import { ItineraryBuilder } from "@/features/itinerary/components/itinerary-builder";

type Props = {
  tenantId: string;
  packageId: string;
  days: ItineraryDayItem[];
};

export function ItineraryTab({ tenantId, packageId, days }: Props) {
  return (
    <ItineraryBuilder
      initialDays={days}
      onCreateDay={(values) => createItineraryDayAction(tenantId, packageId, values)}
      onUpdateDay={(dayId, values) => updateItineraryDayAction(tenantId, dayId, values)}
      onDeleteDay={(dayId) => deleteItineraryDayAction(tenantId, dayId)}
      onReorderDays={(orderedIds) =>
        reorderItineraryDaysAction(tenantId, packageId, { orderedIds })
      }
      onCreateActivity={(dayId, values) => createActivityAction(tenantId, dayId, values)}
      onUpdateActivity={(activityId, values) =>
        updateActivityAction(tenantId, activityId, values)
      }
      onDeleteActivity={(activityId) => deleteActivityAction(tenantId, activityId)}
      onReorderActivities={(dayId, orderedIds) =>
        reorderActivitiesAction(tenantId, dayId, { orderedIds })
      }
    />
  );
}
