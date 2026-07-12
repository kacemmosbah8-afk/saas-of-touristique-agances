"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import type { TagItem } from "@/features/settings/queries/settings.query";
import {
  createTagAction,
  deleteTagAction,
} from "@/features/settings/actions/settings.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantId: string;
  tags: TagItem[];
  canEdit: boolean;
};

export function TagManager({ tenantId, tags, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createTagAction(tenantId, { name: name.trim(), color });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
      toast.success("Tag created.");
      router.refresh();
    });
  }

  function remove(tagId: string, usageCount: number) {
    if (
      usageCount > 0 &&
      !confirm(`This tag is used by ${usageCount} customer${usageCount > 1 ? "s" : ""}. Delete anyway?`)
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTagAction(tenantId, tagId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tag deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Customer Tags</h3>
        <p className="text-muted-foreground text-sm">
          Labels for segmenting customers (VIP, repeat, honeymooners…).
        </p>
      </div>

      {canEdit && (
        <div className="flex items-end gap-2">
          <div className="min-w-[180px] flex-1 space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <Input
              placeholder="Repeat customer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border-input block h-9 w-14 cursor-pointer rounded-md border"
              aria-label="Tag color"
            />
          </div>
          <Button size="sm" onClick={create} disabled={isPending || !name.trim()}>
            <Plus className="mr-1.5 size-4" />
            Add
          </Button>
        </div>
      )}

      {tags.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No tags yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
              <span className="text-muted-foreground flex-1 text-xs">
                {tag.usageCount} customer{tag.usageCount !== 1 ? "s" : ""}
              </span>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-7"
                  disabled={isPending}
                  onClick={() => remove(tag.id, tag.usageCount)}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
