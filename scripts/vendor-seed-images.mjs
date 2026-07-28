#!/usr/bin/env node
/**
 * One-off migration: download every hotlinked Unsplash URL in
 * prisma/seed-catalog.ts's IMG object into public/seed-images/, rewrite the
 * source to reference the local copies, and emit a JSON map of
 * old-url -> new-local-path so the already-seeded dev database can be
 * patched to match (seeding is create-once and won't pick this up on its
 * own). Run once; not part of the normal seed/build pipeline.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const CATALOG_PATH = path.resolve("prisma/seed-catalog.ts");
const IMAGES_DIR = path.resolve("public/seed-images");
const MAP_PATH = path.resolve("scripts/.unsplash-url-map.json");

const source = readFileSync(CATALOG_PATH, "utf8");

const startMarker = "const IMG = {";
const startIdx = source.indexOf(startMarker);
if (startIdx === -1) throw new Error("Could not find `const IMG = {` in seed-catalog.ts");
const endIdx = source.indexOf("\n};\n", startIdx);
if (endIdx === -1) throw new Error("Could not find end of IMG object");
const objectLiteral = source.slice(startIdx + startMarker.length - 1, endIdx + 2); // "{ ... }"

// The literal is plain JS (string arrays only) — safe to evaluate directly.
const IMG = new Function(`return ${objectLiteral};`)();

mkdirSync(IMAGES_DIR, { recursive: true });

const urlToLocal = new Map();
const usedNames = new Set(existsSync(IMAGES_DIR) ? [] : []);

function extForContentType(ct) {
  if (ct?.includes("png")) return "png";
  if (ct?.includes("webp")) return "webp";
  return "jpg";
}

async function download(url, filenameBase) {
  if (urlToLocal.has(url)) return urlToLocal.get(url);
  const res = await fetch(url, { headers: { Accept: "image/jpeg" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extForContentType(res.headers.get("content-type"));
  let name = `${filenameBase}.${ext}`;
  let n = 2;
  while (usedNames.has(name)) {
    name = `${filenameBase}-${n}.${ext}`;
    n++;
  }
  usedNames.add(name);
  writeFileSync(path.join(IMAGES_DIR, name), buf);
  const localPath = `/seed-images/${name}`;
  urlToLocal.set(url, localPath);
  return localPath;
}

let updatedSource = source;
let count = 0;

for (const [key, urls] of Object.entries(IMG)) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url.startsWith("http")) continue; // already local
    const base = `${key}-${i + 1}`;
    process.stdout.write(`Downloading ${key}[${i}] -> ${base} ... `);
    const localPath = await download(url, base);
    console.log(localPath);
    // Replace this exact URL string occurrence(s) in the source text.
    const needle = `"${url}"`;
    const replacement = `"${localPath}"`;
    if (updatedSource.includes(needle)) {
      updatedSource = updatedSource.split(needle).join(replacement);
      count++;
    }
  }
}

writeFileSync(CATALOG_PATH, updatedSource, "utf8");
writeFileSync(MAP_PATH, JSON.stringify(Object.fromEntries(urlToLocal), null, 2));

console.log(`\nDone. ${urlToLocal.size} unique images downloaded, ${count} source occurrences rewritten.`);
console.log(`URL map written to ${MAP_PATH} (for patching already-seeded databases).`);
