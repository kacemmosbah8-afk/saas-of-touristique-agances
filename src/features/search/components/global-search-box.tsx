"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantSlug: string;
  defaultValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
};

/** Header/inline search input that submits to the global search page. */
export function GlobalSearchBox({
  tenantSlug,
  defaultValue = "",
  autoFocus,
  placeholder = "Search hotels, activities, guides…",
}: Props) {
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("q");
        const q = typeof value === "string" ? value.trim() : "";
        router.push(`/${tenantSlug}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
      className="relative w-full"
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search"
      />
    </form>
  );
}
