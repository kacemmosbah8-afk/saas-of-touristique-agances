"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { requestPortalAccessAction } from "@/features/portal/actions/access.action";
import {
  requestPortalAccessSchema,
  type RequestPortalAccessInput,
} from "@/features/portal/schemas/access.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

export function AccessRequestForm({ tenantSlug }: { tenantSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const form = useForm<RequestPortalAccessInput>({
    resolver: zodResolver(requestPortalAccessSchema),
    defaultValues: { bookingReference: "", email: "" },
  });

  function onSubmit(values: RequestPortalAccessInput) {
    startTransition(async () => {
      const result = await requestPortalAccessAction(tenantSlug, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSentMessage(result.data.message);
      form.reset();
    });
  }

  if (sentMessage) {
    return (
      <div className="space-y-3 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
          <Mail className="size-5" />
        </div>
        <p className="text-sm">{sentMessage}</p>
        <Button variant="outline" size="sm" onClick={() => setSentMessage(null)}>
          Use a different booking
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bookingReference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking reference</FormLabel>
              <FormControl>
                <Input placeholder="BK-2026-0001" autoCapitalize="characters" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
    </Form>
  );
}
