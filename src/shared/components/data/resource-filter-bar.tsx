"use client";

import { useCallback, useRef, useTransition } from "react";
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

export type SelectFilterConfig = {
  /** URL search-param key this dropdown controls. */
  key: string;
  /** Label shown for the "no filter" option (its value is always "all"). */
  allLabel: string;
  options: { value: string; label: string }[];
  width?: string;
};

type Props = {
  searchPlaceholder: string;
  /** Extra dropdown filters (status, type, …). Sort is always rendered. */
  filters?: SelectFilterConfig[];
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

/**
 * URL-driven search + filter + sort toolbar shared by every list view.
 * All state lives in the query string so lists are shareable and survive
 * refresh; changing any control resets pagination to page 1.
 */
export function ResourceFilterBar({ searchPlaceholder, filters = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const updateParam = useCallback(
    (key: string, value: string, resetValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === resetValue) {
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

  const hasFilters =
    search ||
    sort !== "newest" ||
    filters.some((f) => {
      const v = searchParams.get(f.key);
      return v && v !== "all";
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          defaultValue={search}
          onChange={(e) => {
            const v = e.target.value;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => updateParam("search", v, ""), 350);
          }}
        />
      </div>

      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? "all"}
          onValueChange={(v) => updateParam(filter.key, v, "all")}
        >
          <SelectTrigger className={filter.width ?? "w-[150px]"}>
            <SelectValue placeholder={filter.allLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.allLabel}</SelectItem>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      <Select value={sort} onValueChange={(v) => updateParam("sort", v, "newest")}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.push(pathname))}>
          <X className="mr-1.5 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
