"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import type { ItineraryDayItem } from "@/features/itinerary/queries/get-itinerary.query";
import type {
  CreateItineraryDayInput,
  CreateActivityInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import { ItineraryDayCard } from "@/features/itinerary/components/itinerary-day-card";
import { DayForm } from "@/features/itinerary/components/day-form";
import { Button } from "@/shared/components/ui/button";

type Props = {
  initialDays: ItineraryDayItem[];
  onCreateDay: (values: CreateItineraryDayInput) => Promise<{ ok: boolean; error?: string }>;
  onUpdateDay: (dayId: string, values: CreateItineraryDayInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteDay: (dayId: string) => Promise<{ ok: boolean; error?: string }>;
  onReorderDays: (orderedIds: string[]) => Promise<{ ok: boolean; error?: string }>;
  onCreateActivity: (dayId: string, values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onUpdateActivity: (activityId: string, values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteActivity: (activityId: string) => Promise<{ ok: boolean; error?: string }>;
  onReorderActivities: (dayId: string, orderedIds: string[]) => Promise<{ ok: boolean; error?: string }>;
};

export function ItineraryBuilder({
  initialDays,
  onCreateDay,
  onUpdateDay,
  onDeleteDay,
  onReorderDays,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  onReorderActivities,
}: Props) {
  const [days, setDays] = useState<ItineraryDayItem[]>(initialDays);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if this is a day-level drag
    const isDayDrag = days.some((d) => d.id === activeId);
    if (isDayDrag) {
      const oldIndex = days.findIndex((d) => d.id === activeId);
      const newIndex = days.findIndex((d) => d.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(days, oldIndex, newIndex);
      setDays(reordered);

      startTransition(async () => {
        const result = await onReorderDays(reordered.map((d) => d.id));
        if (!result.ok) {
          toast.error(result.error ?? "Failed to reorder days.");
          setDays(days); // rollback
        }
      });
      return;
    }

    // Activity-level drag: find which day owns the active activity
    const ownerDay = days.find((d) => d.activities.some((a) => a.id === activeId));
    if (!ownerDay) return;

    const oldIndex = ownerDay.activities.findIndex((a) => a.id === activeId);
    const newIndex = ownerDay.activities.findIndex((a) => a.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedActivities = arrayMove(ownerDay.activities, oldIndex, newIndex);
    const updatedDays = days.map((d) =>
      d.id === ownerDay.id ? { ...d, activities: reorderedActivities } : d,
    );
    setDays(updatedDays);

    startTransition(async () => {
      const result = await onReorderActivities(
        ownerDay.id,
        reorderedActivities.map((a) => a.id),
      );
      if (!result.ok) {
        toast.error(result.error ?? "Failed to reorder activities.");
        setDays(days); // rollback
      }
    });
  }

  async function handleCreateDay(values: CreateItineraryDayInput) {
    const result = await onCreateDay(values);
    if (result.ok) {
      // Re-fetch is done by page revalidation; optimistically add placeholder
      setIsAddingDay(false);
    }
    return result;
  }

  async function handleDeleteDay(dayId: string) {
    const result = await onDeleteDay(dayId);
    if (result.ok) {
      setDays((prev) => prev.filter((d) => d.id !== dayId));
    }
    return result;
  }

  async function handleCreateActivity(dayId: string, values: CreateActivityInput) {
    const result = await onCreateActivity(dayId, values);
    if (result.ok) {
      // Optimistically append a placeholder activity until next server fetch
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                activities: [
                  ...d.activities,
                  {
                    id: `temp-${Date.now()}`,
                    position: d.activities.length,
                    title: values.title,
                    titleFr: values.titleFr ?? null,
                    description: values.description ?? null,
                    descriptionFr: values.descriptionFr ?? null,
                    duration: values.duration ?? null,
                  },
                ],
              }
            : d,
        ),
      );
    }
    return result;
  }

  async function handleDeleteActivity(activityId: string) {
    const result = await onDeleteActivity(activityId);
    if (result.ok) {
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          activities: d.activities.filter((a) => a.id !== activityId),
        })),
      );
    }
    return result;
  }

  return (
    <div className="space-y-4">
      {days.length === 0 && !isAddingDay && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <CalendarDays className="text-muted-foreground size-8" />
          <div>
            <p className="text-sm font-medium">No itinerary yet</p>
            <p className="text-muted-foreground text-sm">Add the first day to get started.</p>
          </div>
          <Button size="sm" onClick={() => setIsAddingDay(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Day 1
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {days.map((day) => (
              <ItineraryDayCard
                key={day.id}
                day={day}
                isDragging={activeDragId === day.id}
                onUpdateDay={(values) => onUpdateDay(day.id, values)}
                onDeleteDay={() => handleDeleteDay(day.id)}
                onCreateActivity={(values) => handleCreateActivity(day.id, values)}
                onUpdateActivity={onUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAddingDay ? (
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Day {days.length + 1}</p>
          <DayForm
            onSubmit={handleCreateDay}
            onCancel={() => setIsAddingDay(false)}
            submitLabel={`Add Day ${days.length + 1}`}
          />
        </div>
      ) : (
        days.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingDay(true)}
          >
            <Plus className="mr-1.5 size-4" />
            Add Day {days.length + 1}
          </Button>
        )
      )}
    </div>
  );
}
