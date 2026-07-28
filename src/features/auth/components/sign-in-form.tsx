"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { signInSchema, type SignInInput } from "@/features/auth/schemas/sign-in.schema";
import { signInAction } from "@/features/auth/actions/sign-in.action";
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

type Props = {
  /** Where to send the user after a successful sign-in. Defaults to onboarding. */
  redirectTo?: string;
  defaultEmail?: string;
};

export function SignInForm({ redirectTo = "/onboarding", defaultEmail = "" }: Props = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signInAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // `refresh()` before `push()`, not after: `redirectTo` is often a
      // route (`/onboarding`) that itself issues a server-side `redirect()`
      // once it sees the new session — calling `refresh()` while that
      // navigation is still in flight cancels it client-side, stranding the
      // user on the intermediate route with the URL bar showing it as
      // "loaded". Refreshing first (revalidating the current page with the
      // now-signed-in session) then pushing avoids the race, and still
      // covers the invite-acceptance flow's same-URL `redirectTo`, where a
      // push to the identical pathname is a router no-op without a refresh.
      router.refresh();
      router.push(redirectTo);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@agency.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
