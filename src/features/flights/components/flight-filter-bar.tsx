"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { type Locale } from "@/shared/i18n/dictionary";
import { getFlightsDict } from "@/shared/i18n/admin-dictionary/flights";
import { getCommonDict } from "@/shared/i18n/admin-dictionary/common";

export function FlightFilterBar({ locale }: { locale: Locale }) {
  const dict = getFlightsDict(locale);
  const common = getCommonDict(locale).filterBar;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sort = searchParams.get("sort") ?? "newest";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all" || value === "newest") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const hasFilters = search || (status && status !== "all") || (sort && sort !== "newest");

  function clearFilters() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder={dict.searchPlaceholder}
          defaultValue={search}
          onChange={(e) => {
            const v = e.target.value;
            clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
            (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
              () => updateParam("search", v),
              350,
            );
          }}
        />
      </div>

      <Select value={status} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={dict.allStatuses} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{dict.allStatuses}</SelectItem>
          <SelectItem value="DRAFT">{dict.statusDraft}</SelectItem>
          <SelectItem value="PUBLISHED">{dict.statusPublished}</SelectItem>
          <SelectItem value="ARCHIVED">{dict.statusArchived}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={common.sortPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{common.sortNewest}</SelectItem>
          <SelectItem value="oldest">{common.sortOldest}</SelectItem>
          <SelectItem value="name_asc">{common.sortNameAsc}</SelectItem>
          <SelectItem value="name_desc">{common.sortNameDesc}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="me-1.5 size-4" />
          {common.clear}
        </Button>
      )}
    </div>
  );
}
