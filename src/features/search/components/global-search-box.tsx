"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { type Locale } from "@/shared/i18n/dictionary";
import { getSearchDict } from "@/shared/i18n/admin-dictionary/search";

type Props = {
  tenantSlug: string;
  defaultValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
  /** Enable the ⌘K / Ctrl+K focus shortcut and show its hint chip (header usage). */
  shortcut?: boolean;
  locale: Locale;
};

/** Header/inline search input that submits to the global search page. */
export function GlobalSearchBox({
  tenantSlug,
  defaultValue = "",
  autoFocus,
  placeholder,
  shortcut = false,
  locale,
}: Props) {
  const dict = getSearchDict(locale);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("q");
        const q = typeof value === "string" ? value.trim() : "";
        router.push(`/${tenantSlug}/admin/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
      className="relative w-full"
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        ref={inputRef}
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={placeholder ?? dict.defaultPlaceholder}
        className={cn(
          "bg-muted/50 focus-visible:bg-background dark:bg-input/30 pl-9 shadow-none",
          shortcut && "pe-14",
        )}
        aria-label={dict.ariaLabel}
      />
      {shortcut ? (
        <kbd className="border-border bg-background/80 text-muted-foreground pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center gap-0.5 rounded border px-1.5 font-sans text-[10px] font-medium select-none sm:inline-flex">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      ) : null}
    </form>
  );
}
