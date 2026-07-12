"use client";

import Link from "next/link";

import {
  createCompanyAction,
  updateCompanyAction,
} from "@/features/crm/actions/company.action";
import { CompanyForm } from "@/features/crm/components/company-form";
import type { CompanyDetail } from "@/features/crm/queries/get-company.query";

export function CompanyFormClient({
  tenantId,
  tenantSlug,
  company,
}: {
  tenantId: string;
  tenantSlug: string;
  company?: CompanyDetail;
}) {
  if (company) {
    return (
      <div className="space-y-8">
        <CompanyForm
          mode="edit"
          tenantSlug={tenantSlug}
          company={company}
          onSubmit={(values) => updateCompanyAction(tenantId, company.id, values)}
        />
        {company.customers.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Linked Customers</h3>
            <ul className="divide-y rounded-lg border">
              {company.customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <Link
                    href={`/${tenantSlug}/customers/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">{c.email ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return (
    <CompanyForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createCompanyAction(tenantId, values)}
    />
  );
}
