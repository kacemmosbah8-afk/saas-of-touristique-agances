"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CircleDollarSign, Compass } from "lucide-react";
import type { LeadStage } from "@prisma/client";

import type { LeadSummary } from "@/features/leads/queries/list-leads.query";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  PIPELINE_STAGES,
} from "@/features/leads/schemas/lead.schema";
import { updateLeadStageAction } from "@/features/leads/actions/lead.action";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  leads: LeadSummary[];
  members: MemberOption[];
  canEdit: boolean;
  locale: Locale;
};

function formatMoney(value: number | null, currency: string) {
  if (value == null) return null;
  return `${currency} ${value.toLocaleString()}`;
}

export function LeadPipeline({ tenantId, tenantSlug, leads, members, canEdit, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const memberNames = new Map(members.map((m) => [m.userId, m.name]));
  const dict = getAdminDictionary(locale).leads;

  function moveStage(leadId: string, stage: LeadStage) {
    startTransition(async () => {
      const lostReason =
        stage === "LOST"
          ? (prompt(dict.lostReasonPrompt) ?? undefined)
          : undefined;
      const result = await updateLeadStageAction(tenantId, leadId, { stage, lostReason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const byStage = new Map<LeadStage, LeadSummary[]>();
  for (const stage of LEAD_STAGES) byStage.set(stage, []);
  for (const lead of leads) byStage.get(lead.stage)?.push(lead);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = byStage.get(stage) ?? [];
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-medium">{LEAD_STAGE_LABELS[stage]}</h3>
                <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
                  {stageLeads.length}
                </span>
              </div>
              <div className="bg-muted/30 min-h-[120px] space-y-2 rounded-lg p-2">
                {stageLeads.length === 0 && (
                  <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                    {dict.noLeads}
                  </p>
                )}
                {stageLeads.map((lead) => (
                  <div key={lead.id} className="bg-card rounded-md border p-3 shadow-sm">
                    <Link
                      href={`/${tenantSlug}/admin/leads/${lead.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {lead.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">{lead.contactName}</p>
                    {lead.source === "PLAN_MY_TRIP" && (
                      <span className="bg-brand-sage/15 text-brand-sage-foreground mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                        <Compass className="size-3" />
                        {dict.planMyTrip}
                        {lead.tripDestination ? ` · ${lead.tripDestination}` : ""}
                      </span>
                    )}
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
                      {formatMoney(lead.estimatedValue, lead.currency) && (
                        <span className="flex items-center gap-1">
                          <CircleDollarSign className="size-3" />
                          {formatMoney(lead.estimatedValue, lead.currency)}
                        </span>
                      )}
                      {lead.expectedCloseDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {new Date(lead.expectedCloseDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {lead.ownerId && (
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {memberNames.get(lead.ownerId) ?? dict.owner}
                      </p>
                    )}
                    {canEdit && (
                      <Select
                        value={lead.stage}
                        onValueChange={(v) => moveStage(lead.id, v as LeadStage)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="mt-2 h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {LEAD_STAGE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
