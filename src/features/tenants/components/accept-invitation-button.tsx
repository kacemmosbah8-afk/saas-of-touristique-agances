"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { acceptInvitationAction } from "@/features/tenants/actions/invitation.action";
import { Button } from "@/shared/components/ui/button";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("You've joined the workspace.");
      router.push(`/${result.data.tenantSlug}`);
      router.refresh();
    });
  }

  return (
    <Button className="w-full" disabled={isPending} onClick={accept}>
      {isPending ? "Joining…" : "Accept invitation"}
    </Button>
  );
}
