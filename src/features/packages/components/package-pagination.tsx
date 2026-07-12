"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

export function PackagePagination({ page, pageCount, total, pageSize }: Props) {
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
      <p className="text-muted-foreground text-sm">
        Showing {start}–{end} of {total} package{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous</span>
        </Button>
        <span className="text-muted-foreground px-2 text-sm">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next</span>
        </Button>
      </div>
    </div>
  );
}
