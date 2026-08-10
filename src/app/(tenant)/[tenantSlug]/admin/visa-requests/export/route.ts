import { NextResponse } from "next/server";

import { prisma } from "@/shared/lib/db";
import { requirePermission, AuthError } from "@/shared/lib/permissions/guard";
import { listVisaRequestsForExport } from "@/features/visa-requests/queries/list-visa-requests-for-export.query";
import { buildVisaRequestsCsv } from "@/features/visa-requests/lib/csv-export";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

/**
 * CSV export for Visa Requests — gated by the same `visaRequest:view`
 * permission as the list/detail pages (anyone who can see the list can
 * export what they can already see). Deliberately narrow: document
 * *metadata* only (category, count) — never file URLs/keys — so this
 * endpoint can't be used to bulk-harvest passport scans. Actual document
 * access still goes through the permission-gated detail page per record.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  try {
    const { db } = await requirePermission(tenant.id, "visaRequest", "view");
    const locale = await getVisitorLocale();
    const rows = await listVisaRequestsForExport(db, tenant.id);
    const csv = buildVisaRequestsCsv(rows, locale);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="visa-requests-${tenantSlug}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }
}
