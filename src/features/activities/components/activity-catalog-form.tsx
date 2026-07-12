"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  activityFormSchema,
  type ActivityFormInput,
} from "@/features/activities/schemas/activity.schema";
import type { ActivityDetail } from "@/features/activities/queries/get-activity.query";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ListEditor } from "@/shared/components/data/list-editor";
import {
  Form,
  FormControl,
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

const NO_SUPPLIER = "__none__";

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  activity?: ActivityDetail;
  suppliers: SupplierOption[];
  onSubmit: (values: ActivityFormInput) => Promise<{ ok: boolean; error?: string; data?: { activityId: string } }>;
};

export function ActivityCatalogForm({ mode, tenantSlug, activity, suppliers, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: activity?.name ?? "",
      category: activity?.category ?? "",
      durationMinutes: activity?.durationMinutes ?? undefined,
      meetingPoint: activity?.meetingPoint ?? "",
      description: activity?.description ?? "",
      includedItems: activity?.includedItems ?? [],
      excludedItems: activity?.excludedItems ?? [],
      country: activity?.country ?? "",
      city: activity?.city ?? "",
      supplierId: activity?.supplierId ?? "",
      internalCost: activity?.internalCost ?? undefined,
      sellingPrice: activity?.sellingPrice ?? undefined,
      currency: activity?.currency ?? "USD",
    },
  });

  function handleSubmit(values: ActivityFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Activity created.");
        router.push(`/${tenantSlug}/activities/${result.data.activityId}/edit`);
      } else {
        toast.success("Saved.");
        router.refresh();
      }
    });
  }

  const numeric = (onChange: (v: number | undefined) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? undefined : Number(e.target.value));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Activity Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sunset Desert Safari" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="Adventure, Cultural…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="240"
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
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meetingPoint"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Meeting Point</FormLabel>
                <FormControl>
                  <Input placeholder="Hotel lobby, main gate…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[120px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Included</FormLabel>
            <Controller
              control={form.control}
              name="includedItems"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Transport, guide, meals…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormItem>
            <FormLabel>Excluded</FormLabel>
            <Controller
              control={form.control}
              name="excludedItems"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Tips, personal expenses…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Supplier</FormLabel>
                <Select
                  value={field.value ? field.value : NO_SUPPLIER}
                  onValueChange={(v) => field.onChange(v === NO_SUPPLIER ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER}>No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
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
            name="internalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="40"
                    {...field}
                    value={field.value ?? ""}
                    onChange={numeric(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="75"
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
                    <Input maxLength={3} className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Activity" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
