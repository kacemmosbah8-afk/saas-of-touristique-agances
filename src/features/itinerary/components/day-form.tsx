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
      description: "",
      notes: "",
      mealBreakfast: "",
      mealLunch: "",
      mealDinner: "",
      transferNotes: "",
      accommodationNotes: "",
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
              <FormLabel>Day Title</FormLabel>
              <FormControl>
                <Input placeholder="Arrival in Marrakech…" {...field} autoFocus />
              </FormControl>
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
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Overview of the day…"
                  className="min-h-[80px] resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
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
                <FormLabel>Breakfast</FormLabel>
                <FormControl>
                  <Input placeholder="Included" {...field} value={field.value ?? ""} />
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
                <FormLabel>Lunch</FormLabel>
                <FormControl>
                  <Input placeholder="Own expense" {...field} value={field.value ?? ""} />
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
                <FormLabel>Dinner</FormLabel>
                <FormControl>
                  <Input placeholder="Included" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="transferNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Transfer Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Airport pickup at 10:00…"
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
                Accommodation{" "}
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
