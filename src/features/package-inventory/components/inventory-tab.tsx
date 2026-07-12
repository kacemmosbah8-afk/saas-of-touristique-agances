"use client";

import type { PackageInventory } from "@/features/package-inventory/queries/get-package-inventory.query";
import type { InventoryOptions } from "@/features/package-inventory/queries/inventory-options.query";
import type { InventoryKind } from "@/features/package-inventory/schemas/package-inventory.schema";
import {
  attachInventoryAction,
  detachInventoryAction,
  reorderInventoryAction,
} from "@/features/package-inventory/actions/package-inventory.action";
import { InventorySection } from "@/features/package-inventory/components/inventory-section";
import { Separator } from "@/shared/components/ui/separator";

type Props = {
  tenantId: string;
  packageId: string;
  inventory: PackageInventory;
  options: InventoryOptions;
  canEdit: boolean;
};

export function InventoryTab({ tenantId, packageId, inventory, options, canEdit }: Props) {
  function section(
    kind: InventoryKind,
    title: string,
    items: PackageInventory[keyof PackageInventory],
    opts: InventoryOptions[keyof InventoryOptions],
    emptyLabel: string,
  ) {
    return (
      <InventorySection
        title={title}
        items={items}
        options={opts}
        canEdit={canEdit}
        emptyLabel={emptyLabel}
        onAttach={(resourceId) =>
          attachInventoryAction(tenantId, packageId, kind, { resourceId })
        }
        onDetach={(joinId) => detachInventoryAction(tenantId, kind, joinId)}
        onReorder={(orderedIds) =>
          reorderInventoryAction(tenantId, packageId, kind, { orderedIds })
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Attach the resources this package uses. Drag to reorder within each group.
      </p>

      {section("hotel", "Hotels", inventory.hotels, options.hotels, "No hotels attached.")}
      <Separator />
      {section("activity", "Activities", inventory.activities, options.activities, "No activities attached.")}
      <Separator />
      {section("guide", "Guides", inventory.guides, options.guides, "No guides attached.")}
      <Separator />
      {section("transport", "Transportation", inventory.transport, options.transport, "No transport attached.")}
      <Separator />
      {section("supplier", "Suppliers", inventory.suppliers, options.suppliers, "No suppliers attached.")}
    </div>
  );
}
