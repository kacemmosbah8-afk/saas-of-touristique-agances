"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import type { TravelCategoryItem } from "@/features/settings/queries/settings.query";
import {
  createTravelCategoryAction,
  deleteTravelCategoryAction,
} from "@/features/settings/actions/settings.action";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  tenantId: string;
  categories: TravelCategoryItem[];
  canEdit: boolean;
};

export function CategoryManager({ tenantId, categories, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createTravelCategoryAction(tenantId, {
        name: name.trim(),
        description,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
      setDescription("");
      toast.success("Category created.");
      router.refresh();
    });
  }

  function remove(categoryId: string) {
    startTransition(async () => {
      const result = await deleteTravelCategoryAction(tenantId, categoryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Travel Categories</h3>
        <p className="text-muted-foreground text-sm">
          Categories used to classify packages and activities (Adventure, Cultural, Beach…).
        </p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] space-y-1.5">
            <label htmlFor="category-name" className="text-xs font-medium">
              Name
            </label>
            <Input
              id="category-name"
              placeholder="Adventure"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label htmlFor="category-description" className="text-xs font-medium">
              Description (optional)
            </label>
            <Input
              id="category-description"
              placeholder="Hiking, trekking, outdoor…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button size="sm" onClick={create} disabled={isPending || !name.trim()}>
            <Plus className="mr-1.5 size-4" />
            Add
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No categories yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{category.name}</p>
                {category.description && (
                  <p className="text-muted-foreground text-xs">{category.description}</p>
                )}
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-7"
                  disabled={isPending}
                  onClick={() => remove(category.id)}
                  aria-label={`Delete category ${category.name}`}
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
