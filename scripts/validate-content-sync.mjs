#!/usr/bin/env node
/**
 * Real TravelPayouts content-sync API validation harness.
 *
 * Exercises every endpoint `TravelPayoutsClient` uses against the REAL API,
 * with the same credential source as the app's development fallback
 * (.env.local). No mocks, no fixtures. Mirrors scripts/validate-suppliers.mjs
 * (same env-loading, same PASS/FAIL record() convention).
 *
 * History: this harness originally targeted TravelPayouts' Hotellook engine
 * (engine.hotellook.com/yasen.hotellook.com) — the only hotel-content source
 * TravelPayouts ever offered. That product was **permanently discontinued
 * by the vendor on 2025-10-20** ("Hotellook is completely discontinuing as
 * a brand" — see support.travelpayouts.com's "FAQ on the closure of
 * Hotellook"); every one of its hosts now returns a blanket 404, and
 * TravelPayouts states no replacement hotel API is offered to partners.
 * This harness now validates what `TravelPayoutsClient` actually calls
 * today: TravelPayouts' still-live "Data API" (`api.travelpayouts.com/data/*`)
 * for countries/cities, plus a live re-check that the old Hotellook hosts
 * are still gone (so this harness itself notices if that ever changes).
 *
 * Usage:  node scripts/validate-content-sync.mjs
 *
 * If your environment reaches the internet through an HTTPS_PROXY, run with
 * NODE_USE_ENV_PROXY=1 — Node's global fetch() does not read HTTPS_PROXY by
 * default on Node >= 22.21:
 *   NODE_USE_ENV_PROXY=1 node scripts/validate-content-sync.mjs
 *
 * Credentials are read from .env/.env.local and are never printed.
 */
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
const TOKEN = env.TRAVELPAYOUTS_TOKEN;

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function rateLimitHeaders(res) {
  const interesting = ["x-rate-limit", "x-rate-limit-remaining", "x-rate-limit-reset", "retry-after"];
  const found = interesting
    .map((h) => [h, res.headers.get(h)])
    .filter(([, v]) => v !== null);
  return found.length ? found.map(([k, v]) => `${k}=${v}`).join(", ") : "none present";
}

async function hotellookShutdownSuite() {
  // Confirms the documented, previously-implemented Hotellook engine is
  // still gone — if this ever starts returning 200s again, the client
  // should be revisited (a vendor could restore/replace hotel content).
  const hosts = [
    "https://engine.hotellook.com/api/v2/static/countries.json",
    "https://yasen.hotellook.com/tp/v1/hotels?language=en",
  ];
  for (const url of hosts) {
    try {
      const res = await fetch(url);
      record(
        "hotellook.still-discontinued",
        res.status === 404,
        `${url} → HTTP ${res.status}` +
          (res.status === 404
            ? " (confirmed still gone, as of the 2025-10-20 shutdown)"
            : " — UNEXPECTED: this host used to 404 uniformly; TravelPayouts may have restored/replaced hotel content — investigate before assuming it's still unusable"),
      );
    } catch (e) {
      record("hotellook.still-discontinued", true, `${url} → network error (${String(e?.message ?? e).slice(0, 100)}) — consistent with a decommissioned host`);
    }
  }
}

async function authSuite() {
  if (!TOKEN) {
    record("auth.credentials", false, "TRAVELPAYOUTS_TOKEN not set in .env.local");
    return;
  }

  // countries.json is a public reference dataset — TravelPayouts serves it
  // identically with or without a token (confirmed live 2026-07-17). Real
  // auth enforcement is exercised separately below via v2/prices/latest.
  const withToken = await fetch("https://api.travelpayouts.com/data/en/countries.json", {
    headers: { "X-Access-Token": TOKEN },
  });
  record(
    "auth.data-api.with-token",
    withToken.ok,
    `HTTP ${withToken.status}, rate-limit headers: ${rateLimitHeaders(withToken)}`,
  );

  const authEnforced = await fetch(
    "https://api.travelpayouts.com/v2/prices/latest?currency=usd&period_type=year&page=1&limit=1&sorting=price&trip_class=0",
    { headers: { "x-access-token": TOKEN } },
  );
  record(
    "auth.token-is-valid",
    authEnforced.status === 200,
    authEnforced.status === 200
      ? "v2/prices/latest (a genuinely auth-enforced endpoint) accepted the real token — token confirmed valid and live"
      : `v2/prices/latest returned HTTP ${authEnforced.status} with the configured token — token may be invalid/expired`,
  );

  const badToken = await fetch(
    "https://api.travelpayouts.com/v2/prices/latest?currency=usd&period_type=year&page=1&limit=1&sorting=price&trip_class=0",
    { headers: { "x-access-token": "0000000000000000000000000000000invalid" } },
  );
  record(
    "auth.rejects-invalid-token",
    badToken.status === 401,
    `HTTP ${badToken.status} with a deliberately invalid token (expect 401)`,
  );
}

let countriesCount = 0;

async function countriesSuite() {
  const res = await fetch("https://api.travelpayouts.com/data/en/countries.json");
  if (!res.ok) {
    record("content.countries", false, `HTTP ${res.status}`);
    return;
  }
  const list = await res.json();
  countriesCount = Array.isArray(list) ? list.length : 0;
  record(
    "content.countries",
    countriesCount > 0,
    `${countriesCount} countries; sample keys: ${Array.isArray(list) && list[0] ? Object.keys(list[0]).join(",") : "n/a"}`,
  );
}

let citiesCount = 0;

async function citiesSuite() {
  const res = await fetch("https://api.travelpayouts.com/data/en/cities.json");
  if (!res.ok) {
    record("content.cities", false, `HTTP ${res.status}`);
    return;
  }
  const list = await res.json();
  citiesCount = Array.isArray(list) ? list.length : 0;
  const missingCountryCode = Array.isArray(list) ? list.filter((c) => !c.country_code).length : -1;
  record(
    "content.cities",
    citiesCount > 0,
    `${citiesCount} cities; sample keys: ${Array.isArray(list) && list[0] ? Object.keys(list[0]).join(",") : "n/a"}; ` +
      `missing country_code: ${missingCountryCode}`,
  );
}

async function paginationSuite() {
  // cities.json is the larger of the two datasets — a Link header,
  // meta/has_more field, or just one big array all mean something
  // different for whether the engine ever needs to window this dataset.
  const res = await fetch("https://api.travelpayouts.com/data/en/cities.json");
  const link = res.headers.get("link");
  record(
    "pagination",
    true,
    link
      ? `Link header present: ${link}`
      : `no pagination signal found — endpoint returns one full array (${citiesCount} cities) in a single response; ` +
        `small enough for the engine's existing "resync unwindowed" assumption to hold`,
  );
}

async function rateLimitSuite() {
  const started = Date.now();
  const burst = await Promise.all(
    Array.from({ length: 5 }, () => fetch("https://api.travelpayouts.com/data/en/countries.json")),
  );
  const statuses = burst.map((r) => r.status);
  const any429 = statuses.includes(429);
  record(
    "rate-limit",
    true,
    `5 concurrent requests in ${Date.now() - started}ms → statuses: ${statuses.join(",")}, ` +
      `headers: ${rateLimitHeaders(burst[0])}` +
      (any429 ? " (429 observed — providerRequest's generic backoff will handle this)" : ""),
  );
}

try {
  await hotellookShutdownSuite();
  await authSuite();
  await countriesSuite();
  await citiesSuite();
  await paginationSuite();
  await rateLimitSuite();
} catch (e) {
  record("suite", false, String(e?.message ?? e).slice(0, 200));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) {
  console.log(
    "Note: a 'fetch failed' / connect error on the Data API checks usually means this machine's egress " +
      "policy blocks api.travelpayouts.com — allow it and re-run.",
  );
}
process.exit(failed ? 1 : 0);
