"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { CustomFieldType } from "@prisma/client";

import type { CustomFieldItem } from "@/features/settings/queries/settings.query";
import {
  createCustomFieldAction,
  deleteCustomFieldAction,
} from "@/features/settings/actions/settings.action";
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
} from "@/features/settings/schemas/settings.schema";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "Yes / No",
  SELECT: "Dropdown",
};

const ENTITY_LABELS: Record<string, string> = {
  customer: "Customer",
  lead: "Lead",
  supplier: "Supplier",
};

type Props = {
  tenantId: string;
  fields: CustomFieldItem[];
  canEdit: boolean;
};

export function CustomFieldManager({ tenantId, fields, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entity, setEntity] = useState<(typeof CUSTOM_FIELD_ENTITIES)[number]>("customer");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("TEXT");
  const [optionsDraft, setOptionsDraft] = useState("");
  const [required, setRequired] = useState(false);

  function create() {
    if (!label.trim()) return;
    const options =
      type === "SELECT"
        ? optionsDraft
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    startTransition(async () => {
      const result = await createCustomFieldAction(tenantId, {
        entity,
        label: label.trim(),
        type,
        options,
        required,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLabel("");
      setOptionsDraft("");
      setRequired(false);
      toast.success("Field created.");
      router.refresh();
    });
  }

  function remove(fieldId: string) {
    startTransition(async () => {
      const result = await deleteCustomFieldAction(tenantId, fieldId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Field deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Custom Fields</h3>
        <p className="text-muted-foreground text-sm">
          Extra fields captured on customers, leads, and suppliers. Rendering inside those forms
          arrives with the booking flows in the next sprint.
        </p>
      </div>

      {canEdit && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <label htmlFor="custom-field-entity" className="text-xs font-medium">
                Applies to
              </label>
              <Select value={entity} onValueChange={(v) => setEntity(v as typeof entity)}>
                <SelectTrigger id="custom-field-entity" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ENTITY_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px] flex-1 space-y-1.5">
              <label htmlFor="custom-field-label" className="text-xs font-medium">
                Label
              </label>
              <Input
                id="custom-field-label"
                placeholder="Dietary requirements"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="custom-field-type" className="text-xs font-medium">
                Type
              </label>
              <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
                <SelectTrigger id="custom-field-type" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox checked={required} onCheckedChange={(checked) => setRequired(checked === true)} />
              Required
            </label>
            <Button size="sm" onClick={create} disabled={isPending || !label.trim()}>
              <Plus className="mr-1.5 size-4" />
              Add Field
            </Button>
          </div>
          {type === "SELECT" && (
            <div className="space-y-1.5">
              <label htmlFor="custom-field-options" className="text-xs font-medium">
                Options (comma-separated)
              </label>
              <Input
                id="custom-field-options"
                placeholder="Vegetarian, Vegan, Halal, None"
                value={optionsDraft}
                onChange={(e) => setOptionsDraft(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
        </div>
      )}

      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No custom fields yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {fields.map((field) => (
            <li key={field.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Badge variant="outline">{ENTITY_LABELS[field.entity] ?? field.entity}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </p>
                <p className="text-muted-foreground text-xs">
                  {FIELD_TYPE_LABELS[field.type]}
                  {field.type === "SELECT" && field.options.length > 0
                    ? `: ${field.options.join(", ")}`
                    : ""}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-7"
                  disabled={isPending}
                  onClick={() => remove(field.id)}
                  aria-label={`Delete field ${field.label}`}
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
