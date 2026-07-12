"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  disabled?: boolean;
};

/**
 * Reusable string-array editor (add via Enter or button, remove with ×).
 * Used for highlights, amenities, languages, attractions, and similar list
 * fields across the app.
 */
export function ListEditor({
  value,
  onChange,
  placeholder = "Add item…",
  maxItems = 50,
  disabled,
}: Props) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxItems) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li
              key={i}
              className="bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
            >
              <span className="flex-1">{item}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-50"
              >
                <X className="size-3.5" />
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < maxItems && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !draft.trim()}
            onClick={addItem}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
