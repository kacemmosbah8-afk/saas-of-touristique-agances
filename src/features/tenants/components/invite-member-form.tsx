"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { createInvitationAction } from "@/features/tenants/actions/invitation.action";
import {
  INVITABLE_ROLES,
  MEMBERSHIP_ROLE_LABELS,
} from "@/features/tenants/schemas/invitation.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = { tenantId: string };

export function InviteMemberForm({ tenantId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>("AGENT");

  function submit() {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await createInvitationAction(tenantId, { email: email.trim(), role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.emailSent
          ? `Invitation sent to ${email.trim()}.`
          : `Invitation created for ${email.trim()}, but the email couldn't be sent — share the link manually or try Resend.`,
      );
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor="invite-email" className="text-xs font-medium">
          Email
        </label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@agency.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="invite-role" className="text-xs font-medium">
          Role
        </label>
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger id="invite-role" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {MEMBERSHIP_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button disabled={isPending || !email.trim()} onClick={submit}>
        <UserPlus className="mr-1.5 size-4" />
        {isPending ? "Sending…" : "Invite"}
      </Button>
    </div>
  );
}
