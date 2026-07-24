"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Utensils,
  BedDouble,
  Bus,
} from "lucide-react";
import { toast } from "sonner";

import type { ItineraryDayItem } from "@/features/itinerary/queries/get-itinerary.query";
import type { CreateItineraryDayInput, CreateActivityInput } from "@/features/itinerary/schemas/itinerary.schema";
import { DayForm } from "@/features/itinerary/components/day-form";
import { ActivityCard } from "@/features/itinerary/components/activity-card";
import { ActivityForm } from "@/features/itinerary/components/activity-form";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { Button } from "@/shared/components/ui/button";

type Props = {
  day: ItineraryDayItem;
  onUpdateDay: (values: CreateItineraryDayInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteDay: () => Promise<{ ok: boolean; error?: string }>;
  onCreateActivity: (values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onUpdateActivity: (activityId: string, values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteActivity: (activityId: string) => Promise<{ ok: boolean; error?: string }>;
  isDragging?: boolean;
};

export function ItineraryDayCard({
  day,
  onUpdateDay,
  onDeleteDay,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  isDragging,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: day.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleDelete() {
    if (
      !(await confirm({
        title: "Delete this day and all its activities?",
        destructive: true,
      }))
    )
      return;
    setIsDeleting(true);
    const result = await onDeleteDay();
    if (!result.ok) {
      toast.error(result.error ?? "Failed to delete day.");
      setIsDeleting(false);
    }
  }

  const hasMeals = day.mealBreakfast || day.mealLunch || day.mealDinner;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      <div className="flex items-start gap-2 p-4">
        <button
          className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder day"
        >
          <GripVertical className="size-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          {isEditing ? (
            <DayForm
              defaultValues={{
                title: day.title,
                titleFr: day.titleFr ?? undefined,
                description: day.description ?? undefined,
                descriptionFr: day.descriptionFr ?? undefined,
                notes: day.notes ?? undefined,
                mealBreakfast: day.mealBreakfast ?? undefined,
                mealBreakfastFr: day.mealBreakfastFr ?? undefined,
                mealLunch: day.mealLunch ?? undefined,
                mealLunchFr: day.mealLunchFr ?? undefined,
                mealDinner: day.mealDinner ?? undefined,
                mealDinnerFr: day.mealDinnerFr ?? undefined,
                transferNotes: day.transferNotes ?? undefined,
                transferNotesFr: day.transferNotesFr ?? undefined,
                accommodationNotes: day.accommodationNotes ?? undefined,
                accommodationNotesFr: day.accommodationNotesFr ?? undefined,
              }}
              onSubmit={onUpdateDay}
              onCancel={() => setIsEditing(false)}
              submitLabel="Save Day"
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  Day {day.dayNumber}
                </span>
                <span className="font-medium">{day.title}</span>
              </div>

              {day.description && (
                <p className="text-muted-foreground mt-1 text-sm">{day.description}</p>
              )}

              {hasMeals && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Utensils className="text-muted-foreground size-3" />
                  {day.mealBreakfast && (
                    <span className="text-muted-foreground">
                      B: {day.mealBreakfast}
                    </span>
                  )}
                  {day.mealLunch && (
                    <span className="text-muted-foreground">L: {day.mealLunch}</span>
                  )}
                  {day.mealDinner && (
                    <span className="text-muted-foreground">D: {day.mealDinner}</span>
                  )}
                </div>
              )}

              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                {day.transferNotes && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Bus className="size-3" />
                    {day.transferNotes}
                  </span>
                )}
                {day.accommodationNotes && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BedDouble className="size-3" />
                    {day.accommodationNotes}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsCollapsed((c) => !c)}
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsEditing(true)}
              aria-label="Edit day"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive size-7"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Delete day"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="border-t px-4 pb-4">
          <SortableContext
            items={day.activities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-3 space-y-2">
              {day.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onUpdate={(values) => onUpdateActivity(activity.id, values)}
                  onDelete={() => onDeleteActivity(activity.id)}
                />
              ))}
            </div>
          </SortableContext>

          {isAddingActivity ? (
            <div className="mt-3 rounded-md border p-3">
              <ActivityForm
                onSubmit={onCreateActivity}
                onCancel={() => setIsAddingActivity(false)}
              />
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground mt-3 h-7 text-xs"
              onClick={() => setIsAddingActivity(true)}
            >
              <Plus className="mr-1 size-3" />
              Add Activity
            </Button>
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
