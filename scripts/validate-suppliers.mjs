#!/usr/bin/env node
/**
 * Real supplier API validation harness (development tooling).
 *
 * Exercises the same endpoints the app uses — against the REAL Hotelbeds
 * API, with the same credential source as the app's development fallback
 * (.env.local). No mocks, no fixtures: every check either talks to the live
 * supplier or fails.
 *
 * Usage:  node scripts/validate-suppliers.mjs
 *
 * Checks:
 *   hotelbeds.health       GET  /hotel-api/1.0/status
 *   hotelbeds.availability POST /hotel-api/1.0/hotels        (live rates for PMI)
 *   hotelbeds.checkrates   POST /hotel-api/1.0/checkrates    (pre-booking revalidation)
 *
 * Credentials are read from .env.local and are never printed.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const env = {};
  let text = "";
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    return env;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?([^"'\n]*)["']?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local"), ...process.env };

const HB_KEY = env.HOTELBEDS_HOTEL_API_KEY;
const HB_SECRET = env.HOTELBEDS_HOTEL_SECRET;
const HB_ENV = env.HOTELBEDS_ENVIRONMENT || "test";
const HB_BASE = HB_ENV === "live" ? "https://api.hotelbeds.com" : "https://api.test.hotelbeds.com";

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function hbHeaders() {
  const ts = Math.floor(Date.now() / 1000);
  return {
    "Api-key": HB_KEY,
    "X-Signature": createHash("sha256").update(HB_KEY + HB_SECRET + ts).digest("hex"),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

const dep = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
const ret = new Date(Date.now() + 52 * 86400_000).toISOString().slice(0, 10);

async function hotelbedsSuite() {
  if (!HB_KEY || !HB_SECRET) {
    record("hotelbeds.credentials", false, "HOTELBEDS_HOTEL_API_KEY / _SECRET not set");
    return;
  }

  const health = await fetch(`${HB_BASE}/hotel-api/1.0/status`, { headers: hbHeaders() });
  record("hotelbeds.health", health.ok, `HTTP ${health.status} (${HB_ENV})`);
  if (!health.ok) return;

  const availRes = await fetch(`${HB_BASE}/hotel-api/1.0/hotels`, {
    method: "POST",
    headers: hbHeaders(),
    body: JSON.stringify({
      stay: { checkIn: dep, checkOut: ret },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
      destination: { code: "PMI" },
    }),
  });
  const availBody = await availRes.json();
  const hotels = availBody.hotels?.hotels ?? [];
  const firstRate = hotels[0]?.rooms?.[0]?.rates?.[0];
  record(
    "hotelbeds.availability",
    availRes.ok && hotels.length > 0,
    availRes.ok
      ? `${hotels.length} hotels in PMI ${dep}→${ret}; first rate: ${firstRate?.rateType} ${firstRate?.net} ${availBody.hotels?.currency}`
      : `HTTP ${availRes.status}: ${JSON.stringify(availBody.error ?? "").slice(0, 120)}`,
  );
  if (!firstRate?.rateKey) return;

  const checkRes = await fetch(`${HB_BASE}/hotel-api/1.0/checkrates`, {
    method: "POST",
    headers: hbHeaders(),
    body: JSON.stringify({ rooms: [{ rateKey: firstRate.rateKey }] }),
  });
  const checkBody = await checkRes.json();
  const rechecked = checkBody.hotel?.rooms?.[0]?.rates?.[0];
  record(
    "hotelbeds.checkrates",
    checkRes.ok && !!rechecked,
    checkRes.ok
      ? `revalidated: ${rechecked?.net} ${checkBody.hotel?.currency} (searched ${firstRate.net})`
      : `HTTP ${checkRes.status}: ${JSON.stringify(checkBody.error ?? "").slice(0, 120)}`,
  );
}

try {
  await hotelbedsSuite();
} catch (e) {
  record("hotelbeds.suite", false, String(e?.message ?? e).slice(0, 200));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) {
  console.log(
    "Note: 'CONNECT tunnel failed / fetch failed' means this machine's egress policy blocks the supplier hosts (api.test.hotelbeds.com, api.hotelbeds.com) — allow them and re-run.",
  );
}
process.exit(failed ? 1 : 0);
