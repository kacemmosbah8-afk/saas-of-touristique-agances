"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createActivitySchema,
  type CreateActivityInput,
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
  defaultValues?: Partial<CreateActivityInput>;
  onSubmit: (values: CreateActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel?: string;
};

export function ActivityForm({ defaultValues, onSubmit, onCancel, submitLabel = "Add Activity" }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateActivityInput>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: "",
      titleFr: "",
      description: "",
      descriptionFr: "",
      duration: undefined,
      ...defaultValues,
    },
  });

  function handleSubmit(values: CreateActivityInput) {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity (Arabic)</FormLabel>
              <FormControl>
                <Input placeholder="زيارة حديقة ماجوريل…" dir="rtl" {...field} autoFocus />
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
              <FormLabel>Activity (French)</FormLabel>
              <FormControl>
                <Input placeholder="Visite du Jardin Majorelle…" {...field} value={field.value ?? ""} />
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
              <FormLabel>Description (Arabic) <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="تفاصيل إضافية…"
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
              <FormLabel>Description (French) <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Détails supplémentaires…"
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

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration <span className="text-muted-foreground font-normal">(minutes, optional)</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="60"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>
                {field.value ? `${Math.floor(field.value / 60)}h ${field.value % 60}m` : ""}
              </FormDescription>
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
