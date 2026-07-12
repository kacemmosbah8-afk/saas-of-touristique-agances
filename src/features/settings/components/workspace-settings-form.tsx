"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { WorkspaceSettings } from "@/features/settings/queries/settings.query";
import {
  updateGeneralSettingsAction,
  updateModuleSettingsAction,
} from "@/features/settings/actions/settings.action";
import {
  COUNTRIES,
  CURRENCIES,
  LANGUAGES,
  TIMEZONES,
} from "@/shared/lib/reference-data";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NONE = "__none__";

type Props = {
  tenantId: string;
  settings: WorkspaceSettings;
  canEdit: boolean;
};

function SettingsSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WorkspaceSettingsForm({ tenantId, settings, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // General
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [language, setLanguage] = useState(settings.defaultLanguage);
  const [timezone, setTimezone] = useState(settings.defaultTimezone);
  const [country, setCountry] = useState(settings.defaultCountry ?? NONE);

  // CRM
  const [duplicateCheck, setDuplicateCheck] = useState(settings.crm.duplicateCheckEnabled);
  const [defaultCustomerType, setDefaultCustomerType] = useState(settings.crm.defaultCustomerType);

  // Leads
  const [staleAfterDays, setStaleAfterDays] = useState(settings.lead.staleAfterDays);
  const [requireLostReason, setRequireLostReason] = useState(settings.lead.requireLostReason);

  // Suppliers
  const [defaultCommission, setDefaultCommission] = useState(settings.supplier.defaultCommissionRate);
  const [requireContracts, setRequireContracts] = useState(settings.supplier.requireContracts);

  // Providers
  const [defaultEnvironment, setDefaultEnvironment] = useState(settings.provider.defaultEnvironment);
  const [healthInterval, setHealthInterval] = useState(settings.provider.healthCheckIntervalMinutes);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Regional Defaults</h3>
          {canEdit && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateGeneralSettingsAction(tenantId, {
                    defaultCurrency: currency,
                    defaultLanguage: language,
                    defaultTimezone: timezone,
                    defaultCountry: country === NONE ? "" : country,
                  }),
                )
              }
            >
              Save
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsSelect
            label="Default Currency"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES}
            disabled={!canEdit}
          />
          <SettingsSelect
            label="Default Language"
            value={language}
            onChange={setLanguage}
            options={LANGUAGES}
            disabled={!canEdit}
          />
          <SettingsSelect
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
            options={TIMEZONES}
            disabled={!canEdit}
          />
          <SettingsSelect
            label="Country"
            value={country}
            onChange={setCountry}
            options={[{ value: NONE, label: "Not set" }, ...COUNTRIES]}
            disabled={!canEdit}
            placeholder="Not set"
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">CRM</h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateModuleSettingsAction(tenantId, {
                    module: "crm",
                    settings: {
                      duplicateCheckEnabled: duplicateCheck,
                      defaultCustomerType,
                    },
                  }),
                )
              }
            >
              Save
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={duplicateCheck}
              onChange={(e) => setDuplicateCheck(e.target.checked)}
              disabled={!canEdit}
              className="size-4 rounded border-gray-300"
            />
            Warn about possible duplicate customers
          </label>
          <SettingsSelect
            label="Default Customer Type"
            value={defaultCustomerType}
            onChange={(v) => setDefaultCustomerType(v as typeof defaultCustomerType)}
            options={[
              { value: "INDIVIDUAL", label: "Individual" },
              { value: "CORPORATE", label: "Corporate" },
              { value: "AGENCY", label: "Agency" },
              { value: "VIP", label: "VIP" },
            ]}
            disabled={!canEdit}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Leads</h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateModuleSettingsAction(tenantId, {
                    module: "lead",
                    settings: { staleAfterDays, requireLostReason },
                  }),
                )
              }
            >
              Save
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mark leads stale after (days)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={staleAfterDays}
              onChange={(e) => setStaleAfterDays(Number(e.target.value) || 1)}
              disabled={!canEdit}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={requireLostReason}
              onChange={(e) => setRequireLostReason(e.target.checked)}
              disabled={!canEdit}
              className="size-4 rounded border-gray-300"
            />
            Require a reason when marking leads lost
          </label>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Suppliers</h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateModuleSettingsAction(tenantId, {
                    module: "supplier",
                    settings: {
                      defaultCommissionRate: defaultCommission,
                      requireContracts,
                    },
                  }),
                )
              }
            >
              Save
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Default commission rate (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(Number(e.target.value) || 0)}
              disabled={!canEdit}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={requireContracts}
              onChange={(e) => setRequireContracts(e.target.checked)}
              disabled={!canEdit}
              className="size-4 rounded border-gray-300"
            />
            Require a contract document for active suppliers
          </label>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Providers</h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateModuleSettingsAction(tenantId, {
                    module: "provider",
                    settings: {
                      defaultEnvironment,
                      healthCheckIntervalMinutes: healthInterval,
                    },
                  }),
                )
              }
            >
              Save
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsSelect
            label="Default environment for new connections"
            value={defaultEnvironment}
            onChange={(v) => setDefaultEnvironment(v as typeof defaultEnvironment)}
            options={[
              { value: "SANDBOX", label: "Sandbox" },
              { value: "PRODUCTION", label: "Production" },
            ]}
            disabled={!canEdit}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Health check interval (minutes)</label>
            <Input
              type="number"
              min={5}
              max={1440}
              value={healthInterval}
              onChange={(e) => setHealthInterval(Number(e.target.value) || 60)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
