import { Mail, MailWarning } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { listPortalCommunications } from "@/features/portal/queries/communications.query";
import { formatDateTime } from "@/features/portal/lib/format";
import { Card, CardContent } from "@/shared/components/ui/card";

export const metadata = { title: "Messages" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PortalMessagesPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const messages = await listPortalCommunications(ctx.db, ctx.tenantId, ctx.customerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground text-sm">Updates {ctx.tenantName} has sent you.</p>
      </div>

      {messages.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm">
          <Mail className="size-8" />
          <p>No messages yet.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-1 pt-6">
            {messages.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b py-3 text-sm last:border-0">
                <div className="flex items-center gap-2.5">
                  {m.status === "SENT" ? (
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                  ) : (
                    <MailWarning className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <p className="font-medium">{m.subject ?? "(no subject)"}</p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{formatDateTime(m.sentAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
