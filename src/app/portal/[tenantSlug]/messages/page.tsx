import { Mail, MailWarning } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { listPortalCommunications } from "@/features/portal/queries/communications.query";
import { formatDateTime } from "@/features/portal/lib/format";
import { Card, CardContent } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";

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
        <EmptyState
          icon={Mail}
          title="No messages yet"
          description={`Emails ${ctx.tenantName} sends about your trips will appear here.`}
        />
      ) : (
        <Card>
          <CardContent>
            <div className="divide-y">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-1 py-3 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {m.status === "SENT" ? (
                      <Mail className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <MailWarning
                        className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                    )}
                    <p className="truncate font-medium">{m.subject ?? "(no subject)"}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 pl-6.5 text-xs sm:pl-0">
                    {formatDateTime(m.sentAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
