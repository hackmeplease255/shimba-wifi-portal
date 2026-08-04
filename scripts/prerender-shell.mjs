// ─────────────────────────────────────────────────────────────────────
// Prerender the portal shell to static HTML (runs automatically after
// `vite build` via the `postbuild` npm script).
//
// WHY: the SSR output is fully deterministic — every dynamic value
// (packages, voucher codes, payment status, ?mac=&ip=&router= params) is
// rendered and read CLIENT-SIDE after hydration. Serving that HTML as a
// static file means Vercel's CDN answers EVERY device URL from the edge:
// static files ignore query strings, so a phone's unique
// ?mac=X&ip=Y&router=Z hotspot redirect never invokes the serverless
// function. No cold start = instant first load for every customer.
//
// Nitro's built-in prerenderer can't be used here: on this TanStack Start
// + Nitro 3 beta setup it runs before the server bundle is built and the
// route 404s. Instead we call the ALREADY-BUILT function (same code Vercel
// would run) and capture its 200 response as index.html.
// ─────────────────────────────────────────────────────────────────────
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, ".vercel", "output");

// Locate the Nitro/Vercel server function (dir name may vary across builds).
let funcDirs = [];
try {
  funcDirs = readdirSync(join(outputDir, "functions"))
    .filter((name) => name.endsWith(".func"))
    .map((name) => join(outputDir, "functions", name));
} catch {
  // fall through — handled below
}

if (funcDirs.length === 0) {
  console.error("[prerender-shell] No .vercel/output/functions/*.func found — did `vite build` run first?");
  process.exit(1);
}

// Import the built function and render "/" exactly as Vercel would.
const entry = join(funcDirs[0], "index.mjs");
const { default: mod } = await import(pathToFileURL(entry).href);
const handler = mod?.default ?? mod;

const response = await handler.fetch(
  new Request("http://localhost/", { headers: { host: "localhost" } }),
  {},
  {},
);

if (response.status !== 200) {
  console.error(`[prerender-shell] SSR returned HTTP ${response.status} — aborting`);
  process.exit(1);
}

const html = await response.text();
if (!html.includes("<!DOCTYPE html>") || !html.includes("<main")) {
  console.error("[prerender-shell] Rendered HTML looks wrong — aborting");
  process.exit(1);
}

// Vercel serves everything under .vercel/output/static as-is, with query
// strings ignored — so this index.html covers /?mac=&ip=&router=&... too.
const staticDir = join(outputDir, "static");
mkdirSync(staticDir, { recursive: true });
writeFileSync(join(staticDir, "index.html"), html);

// Cache policy: 1h browser + 10min CDN + SWR for redeploys (same policy as
// the SSR Cache-Control fix). Static files default to max-age=0 on Vercel,
// so the shell needs an explicit header to be cached.
writeFileSync(
  join(staticDir, "_headers"),
  [
    "/index.html",
    "  Cache-Control: public, max-age=3600, s-maxage=600, stale-while-revalidate=86400",
    "",
  ].join("\n"),
);

console.log(`[prerender-shell] Wrote static/index.html (${html.length} bytes) + _headers`);
process.exit(0);
