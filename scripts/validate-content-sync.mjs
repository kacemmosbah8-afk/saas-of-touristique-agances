#!/usr/bin/env node
/**
 * Real TravelPayouts (Hotellook) content-sync API validation harness.
 *
 * Exercises every endpoint `TravelPayoutsClient` uses — against the REAL
 * API, with the same credential source as the app's development fallback
 * (.env.local). No mocks, no fixtures: every check either talks to the
 * live API or fails and says why. Mirrors scripts/validate-suppliers.mjs
 * exactly (same env-loading, same PASS/FAIL record() convention).
 *
 * This exists because this repository's sandboxed execution environment
 * cannot reach *.travelpayouts.com or *.hotellook.com at all (org egress
 * policy denies the CONNECT — confirmed via the agent-proxy's own
 * diagnostics, not a code or credential problem). Run this script from
 * anywhere that DOES have network access to those hosts (a local machine,
 * a CI runner, the deploy target) to get the real answer this repo's own
 * sandbox cannot produce.
 *
 * Usage:  node scripts/validate-content-sync.mjs
 *
 * If your environment reaches the internet through an HTTPS_PROXY (many
 * corporate/CI networks do), run with NODE_USE_ENV_PROXY=1 — Node's global
 * fetch() does not read HTTPS_PROXY by default on Node >= 22.21:
 *   NODE_USE_ENV_PROXY=1 node scripts/validate-content-sync.mjs
 *
 * What it checks, and why each one exists:
 *   auth.with-token       countries.json WITH the token
 *   auth.without-token    countries.json WITHOUT the token — establishes
 *                         whether these "static" endpoints actually
 *                         enforce auth at all, or are unauthenticated
 *                         public files (affects how the client should
 *                         classify a 401/403 vs. treating it as informational)
 *   content.countries     shape + count of the countries payload
 *   content.locations     shape + count of the cities/locations payload
 *   content.hotels.*      THREE candidate endpoint shapes for "hotels for
 *                         one city" tried in sequence — this is the one
 *                         endpoint this codebase could not confirm against
 *                         official docs (all doc domains 403 from this
 *                         sandbox too); whichever candidate actually
 *                         returns hotel data is the one to keep, and the
 *                         others should be deleted from the client
 *   pagination            whether a large-looking response shows any
 *                         paging signal (Link header, `has_more`-style
 *                         field, or just one big array)
 *   rate-limit             inspects response headers for any rate-limit
 *                         signal, and fires a quick burst to see if a 429
 *                         ever appears (informs whether providerRequest's
 *                         generic backoff is sufficient or a TravelPayouts-
 *                         specific limit needs its own handling)
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
  const interesting = ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "retry-after"];
  const found = interesting
    .map((h) => [h, res.headers.get(h)])
    .filter(([, v]) => v !== null);
  return found.length ? found.map(([k, v]) => `${k}=${v}`).join(", ") : "none present";
}

async function authSuite() {
  if (!TOKEN) {
    record("auth.credentials", false, "TRAVELPAYOUTS_TOKEN not set in .env.local");
    return;
  }

  const withToken = await fetch(`https://engine.hotellook.com/api/v2/static/countries.json?token=${TOKEN}`);
  record(
    "auth.with-token",
    withToken.ok,
    `HTTP ${withToken.status}, rate-limit headers: ${rateLimitHeaders(withToken)}`,
  );

  const withoutToken = await fetch("https://engine.hotellook.com/api/v2/static/countries.json");
  record(
    "auth.without-token",
    true, // informational, not a pass/fail on its own
    withoutToken.ok
      ? "HTTP 200 without a token — this endpoint does NOT enforce auth (adjust error handling: a bad token won't surface as 401 here)"
      : `HTTP ${withoutToken.status} without a token — auth IS enforced on this endpoint`,
  );
}

let countriesCount = 0;

async function countriesSuite() {
  const res = await fetch(`https://engine.hotellook.com/api/v2/static/countries.json?token=${TOKEN}`);
  if (!res.ok) {
    record("content.countries", false, `HTTP ${res.status}`);
    return;
  }
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body?.data ?? body?.countries ?? []);
  countriesCount = Array.isArray(list) ? list.length : 0;
  record(
    "content.countries",
    countriesCount > 0,
    `${countriesCount} countries; sample keys: ${Array.isArray(list) && list[0] ? Object.keys(list[0]).join(",") : "n/a"}`,
  );
}

let citiesCount = 0;
let sampleCity = null;

async function locationsSuite() {
  const res = await fetch(`https://engine.hotellook.com/api/v2/static/locations.json?token=${TOKEN}`);
  if (!res.ok) {
    record("content.locations", false, `HTTP ${res.status}`);
    return;
  }
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body?.data ?? body?.locations ?? body?.cities ?? []);
  citiesCount = Array.isArray(list) ? list.length : 0;
  sampleCity = Array.isArray(list) ? list.find((c) => c?.id != null) : null;
  record(
    "content.locations",
    citiesCount > 0,
    `${citiesCount} cities; sample keys: ${Array.isArray(list) && list[0] ? Object.keys(list[0]).join(",") : "n/a"}`,
  );
}

async function hotelsSuite() {
  if (!sampleCity) {
    record("content.hotels", false, "no sample city id available from content.locations — skipped");
    return;
  }
  const locationId = sampleCity.id;

  const candidates = [
    {
      name: "content.hotels.static-locationId",
      url: `https://engine.hotellook.com/api/v2/static/hotels.json?locationId=${locationId}&token=${TOKEN}`,
    },
    {
      name: "content.hotels.cache-json",
      url: `https://engine.hotellook.com/api/v2/cache.json?location=${locationId}&token=${TOKEN}`,
    },
    {
      name: "content.hotels.lookup",
      url: `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(sampleCity.name?.en ?? sampleCity.name ?? "")}&lang=en&lookFor=hotel&limit=10&token=${TOKEN}`,
    },
  ];

  let anyWorked = false;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url);
      if (!res.ok) {
        record(candidate.name, false, `HTTP ${res.status}`);
        continue;
      }
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body?.results?.hotels ?? body?.data ?? body?.hotels ?? []);
      const count = Array.isArray(list) ? list.length : 0;
      record(
        candidate.name,
        count > 0,
        count > 0
          ? `${count} hotels for locationId ${locationId}; sample keys: ${Object.keys(list[0]).join(",")}`
          : `HTTP 200 but no hotel records in the shape this script expected — response keys: ${Object.keys(body).join(",")}`,
      );
      if (count > 0) anyWorked = true;
    } catch (e) {
      record(candidate.name, false, `threw: ${String(e?.message ?? e).slice(0, 150)}`);
    }
  }

  if (!anyWorked) {
    console.log(
      "  → None of the candidate hotel endpoints returned data. TravelPayoutsClient.fetchHotelsForLocation " +
        "needs to be corrected against whichever real endpoint TravelPayouts confirms (support ticket or a " +
        "reachable copy of https://travelpayouts.github.io/slate/#hotels) before enabling hotel sync in production.",
    );
  }
}

async function paginationSuite() {
  // countries/locations are the two datasets most likely to be large —
  // a Link header, a `meta.next`/`has_more` field, or just a single big
  // array (no pagination at all) all mean something different for the
  // engine's own city-batching (`maxCitiesPerRun`) design.
  const res = await fetch(`https://engine.hotellook.com/api/v2/static/locations.json?token=${TOKEN}`);
  const link = res.headers.get("link");
  const body = res.ok ? await res.json() : null;
  const hasMetaPaging =
    body && !Array.isArray(body) && (body.meta || body.has_more !== undefined || body.next !== undefined);
  record(
    "pagination",
    true,
    link
      ? `Link header present: ${link}`
      : hasMetaPaging
        ? `meta/paging field present on response body`
        : `no pagination signal found — endpoint returns one full array (${citiesCount} cities) in a single response`,
  );
}

async function rateLimitSuite() {
  const started = Date.now();
  const burst = await Promise.all(
    Array.from({ length: 5 }, () => fetch(`https://engine.hotellook.com/api/v2/static/countries.json?token=${TOKEN}`)),
  );
  const statuses = burst.map((r) => r.status);
  const any429 = statuses.includes(429);
  record(
    "rate-limit",
    true,
    `5 concurrent requests in ${Date.now() - started}ms → statuses: ${statuses.join(",")}` +
      (any429 ? " (429 observed — providerRequest's generic backoff will handle this)" : " (no 429 observed at this burst size)"),
  );
}

try {
  await authSuite();
  if (TOKEN) {
    await countriesSuite();
    await locationsSuite();
    await hotelsSuite();
    await paginationSuite();
    await rateLimitSuite();
  }
} catch (e) {
  record("suite", false, String(e?.message ?? e).slice(0, 200));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) {
  console.log(
    "Note: 'fetch failed' / a connect error for every check usually means this machine's egress policy " +
      "blocks engine.hotellook.com — allow it and re-run. This is exactly what happened when this script " +
      "was first authored, from a sandboxed environment with no route to *.travelpayouts.com/*.hotellook.com.",
  );
}
process.exit(failed ? 1 : 0);
