"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  destinationDetailsSchema,
  type DestinationDetailsInput,
} from "@/features/destinations/schemas/destination.schema";
import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";
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

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  destination?: DestinationDetail;
  onSubmit: (values: DestinationDetailsInput) => Promise<{ ok: boolean; error?: string; data?: { destinationId: string } }>;
};

export function DestinationDetailsForm({ mode, tenantSlug, destination, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DestinationDetailsInput>({
    resolver: zodResolver(destinationDetailsSchema),
    defaultValues: {
      name: destination?.name ?? "",
      country: destination?.country ?? "",
      region: destination?.region ?? "",
      city: destination?.city ?? "",
      description: destination?.description ?? "",
      popularAttractions: destination?.popularAttractions ?? [],
    },
  });

  function handleSubmit(values: DestinationDetailsInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Destination created.");
        router.push(`/${tenantSlug}/destinations/${result.data.destinationId}/edit`);
      } else {
        toast.success("Saved.");
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Destination Name</FormLabel>
                <FormControl>
                  <Input placeholder="Marrakech" {...field} />
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
                  <Input placeholder="Morocco" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input placeholder="Marrakech-Safi" {...field} value={field.value ?? ""} />
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
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[140px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem className="sm:col-span-2">
            <FormLabel>Popular Attractions</FormLabel>
            <Controller
              control={form.control}
              name="popularAttractions"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Jemaa el-Fnaa, Bahia Palace…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Destination" : "Save Details"}
        </Button>
      </form>
    </Form>
  );
}
