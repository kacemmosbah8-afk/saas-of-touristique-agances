"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";

import {
  resendInvitationAction,
  revokeInvitationAction,
} from "@/features/tenants/actions/invitation.action";
import type { PendingInvitation } from "@/features/tenants/queries/list-pending-invitations.query";
import { MEMBERSHIP_ROLE_LABELS } from "@/features/tenants/schemas/invitation.schema";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

type Props = { tenantId: string; invitations: PendingInvitation[]; canManage: boolean };

function isExpired(date: Date): boolean {
  return date.getTime() <= Date.now();
}

export function PendingInvitationsList({ tenantId, invitations, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function resend(id: string, email: string) {
    startTransition(async () => {
      const result = await resendInvitationAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation resent to ${email}.`);
      router.refresh();
    });
  }

  function revoke(id: string, email: string) {
    startTransition(async () => {
      const result = await revokeInvitationAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation to ${email} revoked.`);
      router.refresh();
    });
  }

  if (invitations.length === 0) return null;

  return (
    <Card>
      <CardContent className="divide-border divide-y">
        {invitations.map((invite) => {
          const expired = isExpired(invite.expiresAt);
          return (
            <div key={invite.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invite.email}</p>
                <p className="text-muted-foreground text-xs">
                  {expired ? "Expired" : `Expires ${invite.expiresAt.toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">
                  {MEMBERSHIP_ROLE_LABELS[invite.role as keyof typeof MEMBERSHIP_ROLE_LABELS] ??
                    invite.role}
                </Badge>
                {canManage && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={isPending}
                      onClick={() => resend(invite.id, invite.email)}
                      aria-label="Resend invitation"
                    >
                      <Mail className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-7"
                      disabled={isPending}
                      onClick={() => revoke(invite.id, invite.email)}
                      aria-label="Revoke invitation"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
