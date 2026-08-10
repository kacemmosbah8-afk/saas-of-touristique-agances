import Link from "next/link";
import { Stamp, Users } from "lucide-react";

import type { VisaRequestSummary } from "@/features/visa-requests/queries/list-visa-requests.query";
import { VisaRequestStatusBadge } from "@/features/visa-requests/components/visa-request-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";
import { getCountryOptions } from "@/shared/lib/reference-data";

type Props = {
  tenantSlug: string;
  visaRequests: VisaRequestSummary[];
  locale: Locale;
};

function countryLabel(locale: Locale, code: string): string {
  if (locale !== "ar" && locale !== "fr") return code;
  return getCountryOptions(locale).find((c) => c.value === code)?.label ?? code;
}

export function VisaRequestList({ tenantSlug, visaRequests, locale }: Props) {
  const dict = getAdminDictionary(locale).visaRequests;

  if (visaRequests.length === 0) {
    return <EmptyState icon={Stamp} title={dict.noMatch} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-start font-medium">{dict.reference}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.requestedBy}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.destination}</th>
            <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">{dict.visaType}</th>
            <th className="hidden px-4 py-3 text-start font-medium md:table-cell">{dict.pax}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.status}</th>
            <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">{dict.received}</th>
          </tr>
        </thead>
        <tbody>
          {visaRequests.map((r) => (
            <tr key={r.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/visa-requests/${r.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {r.reference}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p>{r.fullName}</p>
                <p className="text-muted-foreground text-xs">{r.email ?? r.phone}</p>
              </td>
              <td className="px-4 py-3">{countryLabel(locale, r.destinationCountry)}</td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">{r.visaType}</td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {r.travelerCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <VisaRequestStatusBadge status={r.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
