"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  roomTypeFormSchema,
  ROOM_TYPE_KINDS,
  type RoomTypeFormInput,
} from "@/features/hotels/schemas/hotel.schema";
import { ROOM_TYPE_KIND_LABELS } from "@/features/hotels/lib/labels";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { InlineImageField } from "@/shared/components/media/inline-image-field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  defaultValues?: Partial<RoomTypeFormInput>;
  onSubmit: (values: RoomTypeFormInput) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel?: string;
};

export function RoomTypeForm({ defaultValues, onSubmit, onCancel, submitLabel = "Add Room Type" }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<RoomTypeFormInput>({
    resolver: zodResolver(roomTypeFormSchema),
    defaultValues: {
      kind: "STANDARD",
      name: "",
      nameFr: "",
      capacity: 2,
      beds: undefined,
      occupancy: undefined,
      basePrice: undefined,
      internalCost: undefined,
      currency: "USD",
      images: [],
      notes: "",
      notesFr: "",
      ...defaultValues,
    },
  });

  function handleSubmit(values: RoomTypeFormInput) {
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

  const numeric = (onChange: (v: number | undefined) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : Number(e.target.value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROOM_TYPE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {ROOM_TYPE_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="غرفة ديلوكس بإطلالة على الحديقة" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (French)</FormLabel>
                <FormControl>
                  <Input placeholder="Deluxe Garden View" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={30} {...field} onChange={numeric(field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="beds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beds</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="1"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="occupancy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Occupancy</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    placeholder="2"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input placeholder="USD" maxLength={3} className="uppercase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Base Price <span className="text-muted-foreground font-normal">/ night</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="120"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Internal Cost{" "}
                  <span className="text-muted-foreground font-normal">(net)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="90"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem>
          <FormLabel>Photos</FormLabel>
          <Controller
            control={form.control}
            name="images"
            render={({ field }) => (
              <InlineImageField
                value={field.value ?? []}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
        </FormItem>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes (Arabic) <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea className="min-h-[60px] resize-none" dir="rtl" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notesFr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes (French) <span className="text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea className="min-h-[60px] resize-none" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>Optional — falls back to the Arabic version if left blank.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
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
