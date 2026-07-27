"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  locale: Locale;
};

export function FlightPagination({ page, pageCount, total, pageSize, locale }: Props) {
  const dict = getAdminDictionary(locale).common.pagination;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (pageCount <= 1) return null;

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">{dict.showing(start, end, total)}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
          <span className="sr-only">{dict.previous}</span>
        </Button>
        <span className="text-muted-foreground px-2 text-sm">{dict.page(page, pageCount)}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
          <span className="sr-only">{dict.next}</span>
        </Button>
      </div>
    </div>
  );
}
