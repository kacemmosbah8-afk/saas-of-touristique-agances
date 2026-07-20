"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createTenantSchema,
  type CreateTenantInput,
} from "@/features/tenants/schemas/create-tenant.schema";
import { createTenantAction } from "@/features/tenants/actions/create-tenant.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CreateTenantForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { name: "", slug: "" },
  });

  function onNameChange(name: string) {
    form.setValue("name", name);
    if (!form.formState.dirtyFields.slug) {
      form.setValue("slug", slugify(name));
    }
  }

  function onSubmit(values: CreateTenantInput) {
    startTransition(async () => {
      const result = await createTenantAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // No session refresh needed: middleware only checks "logged in", and
      // the tenant layout authorizes access with a fresh DB lookup rather
      // than the JWT-cached membership list — see requireTenantMembership.
      router.push(`/${result.data.slug}/admin`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agency name</FormLabel>
              <FormControl>
                <Input
                  placeholder="ONE ONE TOURISME"
                  {...field}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace URL</FormLabel>
              <FormControl>
                <Input placeholder="horizon-travel" {...field} />
              </FormControl>
              <FormDescription>
                travelos.com/{field.value || "your-workspace"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>
    </Form>
  );
}
