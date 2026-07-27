"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import type { TagOption } from "@/features/crm/queries/crm-options.query";
import {
  attachCustomerTagAction,
  detachCustomerTagAction,
} from "@/features/crm/actions/customer-relations.action";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  customerId: string;
  tags: { id: string; name: string; color: string }[];
  availableTags: TagOption[];
  canEdit: boolean;
  locale: Locale;
};

export function CustomerTags({
  tenantId,
  customerId,
  tags,
  availableTags,
  canEdit,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).customers.tags;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  const attachedIds = new Set(tags.map((t) => t.id));
  const options = availableTags.filter((t) => !attachedIds.has(t.id));

  function attach() {
    if (!selected) return;
    const tagId = selected;
    setSelected("");
    startTransition(async () => {
      const result = await attachCustomerTagAction(tenantId, customerId, tagId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function detach(tagId: string) {
    startTransition(async () => {
      const result = await detachCustomerTagAction(tenantId, customerId, tagId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          {canEdit && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => detach(tag.id)}
              className="hover:opacity-70 disabled:opacity-50"
              aria-label={dict.removeTagAria(tag.name)}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      {canEdit && options.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder={dict.addTagPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            disabled={!selected || isPending}
            onClick={attach}
            aria-label={dict.attachTagAria}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}

      {tags.length === 0 && (!canEdit || options.length === 0) && (
        <span className="text-muted-foreground text-xs">{dict.noTags}</span>
      )}
    </div>
  );
}
