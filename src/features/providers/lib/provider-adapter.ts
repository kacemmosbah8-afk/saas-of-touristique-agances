import "server-only";
import type { ProviderType } from "@prisma/client";

import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";

/**
 * Provider adapter contract. Every real integration (Amadeus, Hotelbeds, …)
 * will implement this interface in its own module in a later milestone. The
 * rest of the app — connection testing, sync scheduling, health monitoring —
 * programs against this interface only, so wiring a real provider is purely
 * additive: implement the adapter, register it in `getProviderAdapter`.
 */
export type ConnectionTestResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

export type SyncResult = {
  ok: boolean;
  recordsProcessed: number;
  message: string;
};

export type ProviderAdapter = {
  readonly type: ProviderType;
  /**
   * Verify the stored credentials against the provider. Receives decrypted
   * credentials keyed by credential type; never persists them.
   */
  testConnection(credentials: Record<string, string>, baseUrl: string): Promise<ConnectionTestResult>;
  /** Pull reference data (locations, content, …) from the provider. */
  sync(credentials: Record<string, string>, baseUrl: string): Promise<SyncResult>;
};

/**
 * Offline adapter used until real integrations land. It validates that every
 * required credential slot is present and non-empty, and simulates latency —
 * it never performs network I/O. This gives the connection-testing and sync
 * pipelines a real code path to exercise end-to-end.
 */
class OfflineProviderAdapter implements ProviderAdapter {
  constructor(readonly type: ProviderType) {}

  private missingCredentials(credentials: Record<string, string>): string[] {
    const required = PROVIDER_REGISTRY[this.type].credentialTypes;
    return required.filter((t) => !credentials[t]?.trim());
  }

  async testConnection(
    credentials: Record<string, string>,
  ): Promise<ConnectionTestResult> {
    const started = Date.now();
    // Simulated processing delay so latency numbers are non-zero and varied.
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 120));

    const missing = this.missingCredentials(credentials);
    if (missing.length > 0) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: `Missing credentials: ${missing.join(", ")}. External API calls are not enabled yet — this validates configuration only.`,
      };
    }
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message:
        "Credentials configured. Live connectivity will be verified when the external integration is enabled in a later milestone.",
    };
  }

  async sync(credentials: Record<string, string>): Promise<SyncResult> {
    const missing = this.missingCredentials(credentials);
    if (missing.length > 0) {
      return {
        ok: false,
        recordsProcessed: 0,
        message: `Cannot sync — missing credentials: ${missing.join(", ")}.`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));
    return {
      ok: true,
      recordsProcessed: 0,
      message: "Sync pipeline verified. No external data source is connected yet.",
    };
  }
}

const adapters = new Map<ProviderType, ProviderAdapter>();

/** Resolve the adapter for a provider type (offline stub until integrations land). */
export function getProviderAdapter(type: ProviderType): ProviderAdapter {
  let adapter = adapters.get(type);
  if (!adapter) {
    adapter = new OfflineProviderAdapter(type);
    adapters.set(type, adapter);
  }
  return adapter;
}
