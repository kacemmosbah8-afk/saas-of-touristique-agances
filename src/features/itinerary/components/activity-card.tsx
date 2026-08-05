"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

import type { ItineraryActivityItem } from "@/features/itinerary/queries/get-itinerary.query";
import type { CreateActivityInput } from "@/features/itinerary/schemas/itinerary.schema";
import { ActivityForm } from "@/features/itinerary/components/activity-form";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  activity: ItineraryActivityItem;
  onUpdate: (values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  locale: Locale;
};

export function ActivityCard({ activity, onUpdate, onDelete, locale }: Props) {
  const dict = getAdminDictionary(locale).itinerary;
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, confirmDialog } = useConfirm(locale);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleDelete() {
    if (
      !(await confirm({
        title: dict.deleteActivityConfirmTitle,
        destructive: true,
      }))
    )
      return;
    setIsDeleting(true);
    const result = await onDelete();
    if (!result.ok) {
      toast.error(result.error ?? dict.failedToDeleteActivity);
      setIsDeleting(false);
    }
  }

  function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/40 flex items-start gap-2 rounded-md px-3 py-2"
    >
      <button
        className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={dict.dragToReorderActivity}
      >
        <GripVertical className="size-3.5" />
      </button>

      {isEditing ? (
        <div className="flex-1">
          <ActivityForm
            defaultValues={{
              title: activity.title,
              titleFr: activity.titleFr ?? undefined,
              description: activity.description ?? undefined,
              descriptionFr: activity.descriptionFr ?? undefined,
              duration: activity.duration ?? undefined,
            }}
            onSubmit={onUpdate}
            onCancel={() => setIsEditing(false)}
            submitLabel={getAdminDictionary(locale).common.save}
            locale={locale}
          />
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{activity.title}</span>
            {activity.description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{activity.description}</p>
            )}
            {activity.duration && (
              <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                <Clock className="size-3" />
                {formatDuration(activity.duration)}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setIsEditing(true)}
              aria-label={dict.editActivity}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive size-6"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={dict.deleteActivity}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
