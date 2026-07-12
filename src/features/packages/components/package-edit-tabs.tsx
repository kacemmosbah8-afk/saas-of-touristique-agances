"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import type { PackageDetail } from "@/features/packages/queries/get-package.query";
import type { ItineraryDayItem } from "@/features/itinerary/queries/get-itinerary.query";
import type { PackageInventory } from "@/features/package-inventory/queries/get-package-inventory.query";
import type { InventoryOptions } from "@/features/package-inventory/queries/inventory-options.query";
import { InventoryTab } from "@/features/package-inventory/components/inventory-tab";
import { updatePackageAction } from "@/features/packages/actions/update-package.action";
import { updatePackageBuilderAction } from "@/features/packages/actions/update-package-builder.action";
import { updatePackageSeoAction } from "@/features/packages/actions/update-package-seo.action";
import { PackageDetailsForm } from "@/features/packages/components/package-details-form";
import { PackageBuilderForm } from "@/features/packages/components/package-builder-form";
import { PackageSeoForm } from "@/features/packages/components/package-seo-form";
import { PackageCoverImage } from "@/features/packages/components/package-cover-image";
import { PackageGallery } from "@/features/packages/components/package-gallery";
import { PackageStatusActions } from "@/features/packages/components/package-status-actions";
import { ItineraryTab } from "@/features/itinerary/components/itinerary-tab";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/components/ui/tabs";

type Props = {
  tenantId: string;
  tenantSlug: string;
  pkg: PackageDetail;
  activeTab: string;
  canManage: boolean;
  canDelete: boolean;
  canEdit: boolean;
  itineraryDays: ItineraryDayItem[];
  inventory: PackageInventory;
  inventoryOptions: InventoryOptions;
};

function TabSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "details") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <TabsList className="mb-6">
      <TabsTrigger value="details" onClick={() => switchTab("details")}>
        Details
      </TabsTrigger>
      <TabsTrigger value="builder" onClick={() => switchTab("builder")}>
        Builder
      </TabsTrigger>
      <TabsTrigger value="media" onClick={() => switchTab("media")}>
        Media
      </TabsTrigger>
      <TabsTrigger value="seo" onClick={() => switchTab("seo")}>
        SEO
      </TabsTrigger>
      <TabsTrigger value="itinerary" onClick={() => switchTab("itinerary")}>
        Itinerary
      </TabsTrigger>
      <TabsTrigger value="inventory" onClick={() => switchTab("inventory")}>
        Inventory
      </TabsTrigger>
    </TabsList>
  );
}

export function PackageEditTabs({
  tenantId,
  tenantSlug,
  pkg,
  activeTab,
  canManage,
  canDelete,
  canEdit,
  itineraryDays,
  inventory,
  inventoryOptions,
}: Props) {
  const tab = ["details", "builder", "media", "seo", "itinerary", "inventory"].includes(activeTab)
    ? activeTab
    : "details";

  return (
    <Tabs value={tab} className="space-y-0">
      <Suspense>
        <TabSwitcher />
      </Suspense>

      <TabsContent value="details" className="space-y-6">
        {canEdit ? (
          <PackageDetailsForm
            tenantSlug={tenantSlug}
            pkg={pkg}
            onSubmit={(values) => updatePackageAction(tenantId, pkg.id, values)}
          />
        ) : (
          <ReadOnlyDetails pkg={pkg} />
        )}
      </TabsContent>

      <TabsContent value="builder" className="space-y-6">
        {canEdit ? (
          <PackageBuilderForm
            pkg={pkg}
            onSubmit={(values) => updatePackageBuilderAction(tenantId, pkg.id, values)}
          />
        ) : (
          <ReadOnlyBuilder pkg={pkg} />
        )}
      </TabsContent>

      <TabsContent value="media" className="space-y-8">
        <PackageCoverImage
          tenantId={tenantId}
          packageId={pkg.id}
          coverImageUrl={pkg.coverImageUrl}
          canEdit={canEdit}
        />
        <Separator />
        <PackageGallery
          tenantId={tenantId}
          packageId={pkg.id}
          images={pkg.images}
          canEdit={canEdit}
        />
      </TabsContent>

      <TabsContent value="seo" className="space-y-6">
        {canEdit ? (
          <PackageSeoForm
            pkg={pkg}
            onSubmit={(values) => updatePackageSeoAction(tenantId, pkg.id, values)}
          />
        ) : (
          <ReadOnlySeo pkg={pkg} />
        )}
      </TabsContent>

      <TabsContent value="itinerary" className="space-y-6">
        {canEdit ? (
          <ItineraryTab
            tenantId={tenantId}
            packageId={pkg.id}
            days={itineraryDays}
          />
        ) : (
          <ReadOnlyItinerary days={itineraryDays} />
        )}
      </TabsContent>

      <TabsContent value="inventory" className="space-y-6">
        <InventoryTab
          tenantId={tenantId}
          packageId={pkg.id}
          inventory={inventory}
          options={inventoryOptions}
          canEdit={canEdit}
        />
      </TabsContent>

      {(canManage || canDelete) && (
        <div className="mt-8">
          <PackageStatusActions
            tenantId={tenantId}
            tenantSlug={tenantSlug}
            packageId={pkg.id}
            status={pkg.status}
            canManage={canManage}
            canDelete={canDelete}
          />
        </div>
      )}
    </Tabs>
  );
}

function ReadOnlyDetails({ pkg }: { pkg: PackageDetail }) {
  return (
    <div className="space-y-4 text-sm">
      <Field label="Name" value={pkg.name} />
      <Field label="Slug" value={pkg.slug} />
      {pkg.shortDescription && <Field label="Short Description" value={pkg.shortDescription} />}
      {pkg.description && <Field label="Description" value={pkg.description} />}
      {pkg.destination && <Field label="Destination" value={pkg.destination} />}
      {pkg.country && <Field label="Country" value={pkg.country} />}
      {pkg.duration && <Field label="Duration" value={`${pkg.duration} days${pkg.durationNights ? ` / ${pkg.durationNights} nights` : ""}`} />}
      {pkg.category && <Field label="Category" value={pkg.category} />}
      {pkg.difficulty && <Field label="Difficulty" value={pkg.difficulty} />}
      {pkg.featured && <Field label="Featured" value="Yes" />}
    </div>
  );
}

function ReadOnlyBuilder({ pkg }: { pkg: PackageDetail }) {
  return (
    <div className="space-y-6 text-sm">
      {pkg.highlights.length > 0 && <ListField label="Highlights" items={pkg.highlights} />}
      {pkg.includedServices.length > 0 && <ListField label="Included" items={pkg.includedServices} />}
      {pkg.excludedServices.length > 0 && <ListField label="Excluded" items={pkg.excludedServices} />}
      {pkg.importantNotes.length > 0 && <ListField label="Important Notes" items={pkg.importantNotes} />}
      {pkg.whatToBring.length > 0 && <ListField label="What to Bring" items={pkg.whatToBring} />}
      {pkg.meetingPoint && <Field label="Meeting Point" value={pkg.meetingPoint} />}
      {pkg.cancellationPolicy && <Field label="Cancellation Policy" value={pkg.cancellationPolicy} />}
    </div>
  );
}

function ReadOnlySeo({ pkg }: { pkg: PackageDetail }) {
  return (
    <div className="space-y-4 text-sm">
      {pkg.seoTitle && <Field label="SEO Title" value={pkg.seoTitle} />}
      {pkg.seoDescription && <Field label="SEO Description" value={pkg.seoDescription} />}
      {!pkg.seoTitle && !pkg.seoDescription && (
        <p className="text-muted-foreground">No SEO settings configured.</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadOnlyItinerary({ days }: { days: ItineraryDayItem[] }) {
  if (days.length === 0) {
    return <p className="text-muted-foreground text-sm">No itinerary configured.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      {days.map((day) => (
        <div key={day.id} className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-semibold">
              Day {day.dayNumber}
            </span>
            <span className="font-medium">{day.title}</span>
          </div>
          {day.description && (
            <p className="text-muted-foreground mt-1">{day.description}</p>
          )}
          {day.activities.length > 0 && (
            <ul className="mt-2 space-y-1">
              {day.activities.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>
                    {a.title}
                    {a.duration ? ` (${a.duration}m)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
