// ─────────────────────────────────────────────────────────────────────
// Static build — emit a Vercel Build Output (.vercel/output) containing
// ONE tiny, fully self-contained portal page.
//
// WHY: the previous React/TanStack portal bundled to a ~500 KB single
// HTML file. Old captive-portal WebViews (e.g. Samsung Galaxy S6 era)
// fail to parse/render such a large page and show raw HTML text. The
// replacement is a hand-written ~15 KB vanilla page with zero external
// assets — it renders on any WebView from ~2012 onward.
//
// Vercel serves everything under .vercel/output/static as-is (query
// strings ignored), so this index.html covers /?mac=&ip=&router=&... too.
// ─────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, ".vercel", "output");
const staticDir = join(outputDir, "static");

mkdirSync(staticDir, { recursive: true });

// 1. Portal page — inject the API base URL (Vercel env var or default).
let html = readFileSync(join(root, "portal.html"), "utf8");
const apiBase = (process.env.VITE_API_BASE_URL || "https://api.shimbawifi.xyz").replace(/\/+$/, "");
html = html.split("__API_BASE__").join(apiBase);
writeFileSync(join(staticDir, "index.html"), html);

// 2. Favicon.
for (const cand of ["public/favicon.ico", "favicon.ico"]) {
  const f = join(root, cand);
  if (existsSync(f)) {
    copyFileSync(f, join(staticDir, "favicon.ico"));
    break;
  }
}

// 3. Build Output API config with a sane cache policy for the shell HTML.
const CACHE = "public, max-age=3600, s-maxage=600, stale-while-revalidate=86400";
const config = {
  version: 3,
  headers: [
    { source: "/", headers: [{ key: "Cache-Control", value: CACHE }] },
    { source: "/index.html", headers: [{ key: "Cache-Control", value: CACHE }] },
  ],
};
writeFileSync(join(outputDir, "config.json"), JSON.stringify(config, null, 2));

console.log(`[build-static] Wrote .vercel/output/static/index.html (${html.length} bytes)`);
