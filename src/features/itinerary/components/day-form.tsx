"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createItineraryDaySchema,
  type CreateItineraryDayInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

type Props = {
  defaultValues?: Partial<CreateItineraryDayInput>;
  onSubmit: (values: CreateItineraryDayInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel?: string;
};

export function DayForm({ defaultValues, onSubmit, onCancel, submitLabel = "Add Day" }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateItineraryDayInput>({
    resolver: zodResolver(createItineraryDaySchema),
    defaultValues: {
      title: "",
      titleFr: "",
      description: "",
      descriptionFr: "",
      notes: "",
      mealBreakfast: "",
      mealBreakfastFr: "",
      mealLunch: "",
      mealLunchFr: "",
      mealDinner: "",
      mealDinnerFr: "",
      transferNotes: "",
      transferNotesFr: "",
      accommodationNotes: "",
      accommodationNotesFr: "",
      ...defaultValues,
    },
  });

  function handleSubmit(values: CreateItineraryDayInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      form.reset();
      onCancel();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day Title (Arabic)</FormLabel>
              <FormControl>
                <Input placeholder="الوصول إلى مراكش…" dir="rtl" {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="titleFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day Title (French)</FormLabel>
              <FormControl>
                <Input placeholder="Arrivée à Marrakech…" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description (Arabic){" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="نظرة عامة على اليوم…"
                  className="min-h-[80px] resize-none"
                  dir="rtl"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descriptionFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description (French){" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Aperçu de la journée…"
                  className="min-h-[80px] resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="mealBreakfast"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breakfast (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="مشمول" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mealLunch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lunch (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="على نفقتكم" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mealDinner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dinner (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="مشمول" dir="rtl" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mealBreakfastFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breakfast (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Inclus" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mealLunchFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lunch (French)</FormLabel>
                <FormControl>
                  <Input placeholder="À votre charge" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mealDinnerFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dinner (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Inclus" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="transferNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Transfer Notes (Arabic){" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="استقبال من المطار الساعة 10:00…"
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transferNotesFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Transfer Notes (French){" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Prise en charge à l'aéroport à 10h00…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accommodationNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Accommodation (Arabic){" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="رياض لا ميزون دوريه…"
                    dir="rtl"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accommodationNotesFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Accommodation (French){" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Riad La Maison Dorée…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Internal Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Staff reminders, tips…"
                  className="min-h-[60px] resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
