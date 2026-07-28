import { z } from "zod";

export const createItineraryDaySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  titleFr: z.string().max(200, "Title is too long").optional(),
  description: z.string().max(5000, "Description is too long").optional(),
  descriptionFr: z.string().max(5000, "Description is too long").optional(),
  notes: z.string().max(2000, "Notes are too long").optional(),
  mealBreakfast: z.string().max(500, "Too long").optional(),
  mealBreakfastFr: z.string().max(500, "Too long").optional(),
  mealLunch: z.string().max(500, "Too long").optional(),
  mealLunchFr: z.string().max(500, "Too long").optional(),
  mealDinner: z.string().max(500, "Too long").optional(),
  mealDinnerFr: z.string().max(500, "Too long").optional(),
  transferNotes: z.string().max(1000, "Too long").optional(),
  transferNotesFr: z.string().max(1000, "Too long").optional(),
  accommodationNotes: z.string().max(1000, "Too long").optional(),
  accommodationNotesFr: z.string().max(1000, "Too long").optional(),
});

export type CreateItineraryDayInput = z.infer<typeof createItineraryDaySchema>;

export const updateItineraryDaySchema = createItineraryDaySchema;
export type UpdateItineraryDayInput = z.infer<typeof updateItineraryDaySchema>;

export const reorderItineraryDaysSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});

export type ReorderItineraryDaysInput = z.infer<typeof reorderItineraryDaysSchema>;

export const createActivitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  titleFr: z.string().max(200, "Title is too long").optional(),
  description: z.string().max(2000, "Description is too long").optional(),
  descriptionFr: z.string().max(2000, "Description is too long").optional(),
  duration: z
    .number()
    .int("Must be a whole number")
    .min(1, "Minimum 1 minute")
    .max(1440, "Maximum 24 hours")
    .optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const reorderActivitiesSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});

export type ReorderActivitiesInput = z.infer<typeof reorderActivitiesSchema>;
