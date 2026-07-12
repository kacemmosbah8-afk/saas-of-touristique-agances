"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  updatePackageBuilderSchema,
  type UpdatePackageBuilderInput,
} from "@/features/packages/schemas/package.schema";
import type { PackageDetail } from "@/features/packages/queries/get-package.query";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { ListEditor } from "@/features/packages/components/list-editor";

type Props = {
  pkg: PackageDetail;
  onSubmit: (values: UpdatePackageBuilderInput) => Promise<{ ok: boolean; error?: string }>;
};

export function PackageBuilderForm({ pkg, onSubmit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdatePackageBuilderInput>({
    resolver: zodResolver(updatePackageBuilderSchema),
    defaultValues: {
      highlights: pkg.highlights,
      includedServices: pkg.includedServices,
      excludedServices: pkg.excludedServices,
      importantNotes: pkg.importantNotes,
      whatToBring: pkg.whatToBring,
      cancellationPolicy: pkg.cancellationPolicy ?? "",
      meetingPoint: pkg.meetingPoint ?? "",
    },
  });

  function handleSubmit(values: UpdatePackageBuilderInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Builder content saved.");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="highlights"
          render={() => (
            <FormItem>
              <FormLabel>Highlights</FormLabel>
              <Controller
                control={form.control}
                name="highlights"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add a highlight…"
                    disabled={isPending}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includedServices"
          render={() => (
            <FormItem>
              <FormLabel>What&apos;s Included</FormLabel>
              <Controller
                control={form.control}
                name="includedServices"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add included service…"
                    disabled={isPending}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="excludedServices"
          render={() => (
            <FormItem>
              <FormLabel>What&apos;s Not Included</FormLabel>
              <Controller
                control={form.control}
                name="excludedServices"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add excluded service…"
                    disabled={isPending}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="importantNotes"
          render={() => (
            <FormItem>
              <FormLabel>Important Notes</FormLabel>
              <Controller
                control={form.control}
                name="importantNotes"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add important note…"
                    disabled={isPending}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatToBring"
          render={() => (
            <FormItem>
              <FormLabel>What to Bring</FormLabel>
              <Controller
                control={form.control}
                name="whatToBring"
                render={({ field }) => (
                  <ListEditor
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add item to bring…"
                    disabled={isPending}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meetingPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Point</FormLabel>
              <FormControl>
                <Input
                  placeholder="Hotel lobby, airport arrivals…"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cancellationPolicy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cancellation Policy</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Free cancellation up to 48 hours before departure…"
                  className="min-h-[120px]"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Builder Content"}
        </Button>
      </form>
    </Form>
  );
}
