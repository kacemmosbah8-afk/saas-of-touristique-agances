"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function LogsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const provider = searchParams.get("provider") ?? "all";
  const level = searchParams.get("level") ?? "all";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = provider !== "all" || level !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={provider} onValueChange={(v) => update("provider", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All providers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All providers</SelectItem>
          <SelectItem value="DUFFEL">Duffel</SelectItem>
          <SelectItem value="HOTELBEDS">Hotelbeds</SelectItem>
          <SelectItem value="AMADEUS">Amadeus</SelectItem>
        </SelectContent>
      </Select>

      <Select value={level} onValueChange={(v) => update("level", v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          <SelectItem value="INFO">Info</SelectItem>
          <SelectItem value="WARN">Warning</SelectItem>
          <SelectItem value="ERROR">Error</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.push(pathname))}
        >
          <X className="mr-1.5 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
