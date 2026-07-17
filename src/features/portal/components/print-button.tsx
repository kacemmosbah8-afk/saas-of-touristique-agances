"use client";

import { Printer } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * "Print or save as PDF" affordance for the portal's printable documents
 * (invoice, voucher). The portal's document-delivery convention is the
 * browser's print dialog — this button just makes that discoverable for
 * travelers who won't think to press Ctrl+P. `print:hidden` keeps it out
 * of the printed document itself.
 */
export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
