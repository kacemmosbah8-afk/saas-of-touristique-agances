"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  transportFormSchema,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABELS,
  type TransportFormInput,
} from "@/features/transport/schemas/transport.schema";
import type { TransportDetail } from "@/features/transport/queries/get-transport.query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  mode: "create" | "edit";
  tenantSlug: string;
  provider?: TransportDetail;
  onSubmit: (values: TransportFormInput) => Promise<{ ok: boolean; error?: string; data?: { providerId: string } }>;
};

export function TransportForm({ mode, tenantSlug, provider, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TransportFormInput>({
    resolver: zodResolver(transportFormSchema),
    defaultValues: {
      name: provider?.name ?? "",
      type: provider?.type ?? "PRIVATE",
      country: provider?.country ?? "",
      city: provider?.city ?? "",
      contactName: provider?.contactName ?? "",
      contactEmail: provider?.contactEmail ?? "",
      contactPhone: provider?.contactPhone ?? "",
      website: provider?.website ?? "",
      fleetNotes: provider?.fleetNotes ?? "",
      pricingNotes: provider?.pricingNotes ?? "",
      internalNotes: provider?.internalNotes ?? "",
    },
  });

  function handleSubmit(values: TransportFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Provider created.");
        router.push(`/${tenantSlug}/admin/transport/${result.data.providerId}/edit`);
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
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Atlas Transfers" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
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
                    {TRANSPORT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TRANSPORT_TYPE_LABELS[t]}
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
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fleetNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Fleet Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Vehicle types, capacity, condition…"
                    className="min-h-[80px]"
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
            name="pricingNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Pricing Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Per-transfer / per-day rates, seasonal pricing…"
                    className="min-h-[80px]"
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
            name="internalNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Internal Notes{" "}
                  <span className="text-muted-foreground font-normal">(not shown to customers)</span>
                </FormLabel>
                <FormControl>
                  <Textarea className="min-h-[60px]" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create Provider" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
