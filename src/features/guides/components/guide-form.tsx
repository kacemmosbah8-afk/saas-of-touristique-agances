"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  guideFormSchema,
  type GuideFormInput,
} from "@/features/guides/schemas/guide.schema";
import type { GuideDetail } from "@/features/guides/queries/get-guide.query";
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
  guide?: GuideDetail;
  onSubmit: (values: GuideFormInput) => Promise<{ ok: boolean; error?: string; data?: { guideId: string } }>;
};

export function GuideForm({ mode, tenantSlug, guide, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<GuideFormInput>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: {
      name: guide?.name ?? "",
      languages: guide?.languages ?? [],
      certifications: guide?.certifications ?? [],
      experienceYears: guide?.experienceYears ?? undefined,
      dailyRate: guide?.dailyRate ?? undefined,
      currency: guide?.currency ?? "USD",
      country: guide?.country ?? "",
      city: guide?.city ?? "",
      contactEmail: guide?.contactEmail ?? "",
      contactPhone: guide?.contactPhone ?? "",
      availabilityNotes: guide?.availabilityNotes ?? "",
      internalNotes: guide?.internalNotes ?? "",
    },
  });

  function handleSubmit(values: GuideFormInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (mode === "create" && result.data) {
        toast.success("Guide created.");
        router.push(`/${tenantSlug}/admin/guides/${result.data.guideId}/edit`);
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
                <FormLabel>Guide Name</FormLabel>
                <FormControl>
                  <Input placeholder="Youssef El Amrani" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem className="sm:col-span-2">
            <FormLabel>Languages</FormLabel>
            <Controller
              control={form.control}
              name="languages"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="English, French, Arabic…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormItem className="sm:col-span-2">
            <FormLabel>Certifications</FormLabel>
            <Controller
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <ListEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="National Tourism License, First Aid…"
                  disabled={isPending}
                />
              )}
            />
          </FormItem>

          <FormField
            control={form.control}
            name="experienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience (years)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    placeholder="8"
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
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="150"
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
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availabilityNotes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Availability Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Available weekends, off-season only…"
                    className="min-h-[70px]"
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
          {isPending ? "Saving…" : mode === "create" ? "Create Guide" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
