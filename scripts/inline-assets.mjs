// Inline ALL assets into the prerendered index.html so the page is a
// SINGLE self-contained file. Captive-portal browsers (MikroTik walled
// garden, Android captive browser, Samsung Internet Mini, MIUI, ...)
// load the HTML document but often BLOCK or fail to fetch external
// /assets/*.css and /assets/*.js files, so the page renders as plain
// unstyled text on some devices. Inlining everything means exactly ONE
// request and nothing for the hotspot to block.
//
// Runs automatically after `vite build` + `prerender-shell.mjs` via the
// `postbuild` npm script.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, ".vercel", "output", "static");

const htmlPath = join(staticDir, "index.html");
if (!existsSync(htmlPath)) {
  console.error("[inline-assets] static/index.html not found - did vite build + prerender-shell run first?");
  process.exit(1);
}

let html = readFileSync(htmlPath, "utf8");

// ---- 1. Inline CSS --------------------------------------------------
html = html.replace(/<link rel="stylesheet" href="(\/assets\/[^"]+\.css)"[^>]*\/?>/g, (_m, href) => {
  const cssPath = join(staticDir, href.replace(/^\//, ""));
  if (!existsSync(cssPath)) return _m;
  let css = readFileSync(cssPath, "utf8");
  // Inline any url(/assets/...) references inside the CSS (fonts/images)
  css = css.replace(/url\(\s*["']?(\/assets\/[^"')]+)["']?\s*\)/g, (mm, url) => {
    const f = join(staticDir, url.replace(/^\//, ""));
    if (!existsSync(f)) return mm;
    const b64 = readFileSync(f).toString("base64");
    const ext = (f.split(".").pop() || "").toLowerCase();
    const mime =
      ext === "svg" ? "image/svg+xml"
      : ext === "png" ? "image/png"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "gif" ? "image/gif"
      : ext === "webp" ? "image/webp"
      : ext === "woff" ? "font/woff"
      : ext === "woff2" ? "font/woff2"
      : ext === "ttf" ? "font/ttf"
      : "application/octet-stream";
    return `url(data:${mime};base64,${b64})`;
  });
  return `<style>${css}</style>`;
});

// ---- 2. Inline favicon ----------------------------------------------
html = html.replace(/<link rel="icon" href="(\/[^"]+\.ico)"[^>]*\/?>/g, (_m, href) => {
  const f = join(staticDir, href.replace(/^\//, ""));
  if (!existsSync(f)) return _m;
  const b64 = readFileSync(f).toString("base64");
  return `<link rel="icon" href="data:image/x-icon;base64,${b64}" type="image/x-icon"/>`;
});

// ---- 3. Inline JS ---------------------------------------------------
// All JS assets become modules in a tiny in-module registry:
//   window.__PORTAL_FACTORIES__[url]  -> lazy factory function
//   window.__PORTAL_MODULES__[url]    -> resolved exports object
//   __portalRequire(url)              -> run factory (once), return exports
//   __portalChunk(url)                -> Promise<exports> (dynamic import)
// Static `import{...}from"./X.js"` between ANY chunks (entry -> vendor,
// chunk -> vendor, chunk -> entry) is rewritten to read the dependency's
// exports through __portalRequire(), which executes the dependency's
// factory lazily. This handles multi-chunk builds (e.g. Vite splitting
// a QueryClientProvider vendor chunk) instead of assuming every chunk
// imports only from the entry's window.__PORTAL_EXPORTS__.
const scriptTags = [...html.matchAll(/<script([^>]*)><\/script>/g)].map((m) => m[0]);
const moduleSrcTags = scriptTags.filter((t) => /type="module"/.test(t) && /src="\/assets\//.test(t));

if (moduleSrcTags.length === 0) {
  console.warn("[inline-assets] No external module script tags found - nothing to inline");
} else {
  const entryHref = moduleSrcTags[0].match(/src="(\/assets\/[^"]+\.js)"/)[1];
  const entryPath = join(staticDir, entryHref.replace(/^\//, ""));

  // All JS asset files (entry + chunks)
  const jsFiles = [];
  for (const t of [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)]) {
    if (!jsFiles.includes(t[1])) jsFiles.push(t[1]);
  }
  if (!jsFiles.includes(entryHref)) jsFiles.push(entryHref);
  const chunks = jsFiles.filter((f) => f !== entryHref);

  const parseImportBindings = (spec) =>
    spec
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const parts = pair.split(/\s+as\s+/);
        const remote = parts[0].trim();
        const local = parts.length > 1 ? parts[1].trim() : remote;
        return `${remote}:${local}`;
      })
      .join(",");

  const parseExportBindings = (spec) =>
    spec
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const parts = pair.split(/\s+as\s+/);
        const local = parts[0].trim();
        const as = parts.length > 1 ? parts[1].trim() : local;
        return `${as}:${local}`;
      })
      .join(",");

  // Resolve a relative `./X.js` dep to its absolute /assets/X.js key.
  const resolveDepUrl = (from) => "/assets/" + from.split("/").pop();

  // Read + transform a chunk into a lazy factory assignment.
  //   import{A as e,...}from"./dep.js";  ->  const {A:e,...}=__portalRequire("/assets/dep.js");
  //   ...body... export{X as y};          ->  ...body... window.__PORTAL_MODULES__[url]={y:X};
  const buildChunkFactory = (url) => {
    const file = join(staticDir, url.replace(/^\//, ""));
    if (!existsSync(file)) return null;
    let code = readFileSync(file, "utf8");

    let importLine = "";
    code = code.replace(/^import\{([^}]*)\}from"([^"]+)";?/m, (_m, spec, from) => {
      importLine = `const {${parseImportBindings(spec)}}=__portalRequire(${JSON.stringify(resolveDepUrl(from))});`;
      return "";
    });

    code = code.replace(/export\{([^}]*)\};?\s*$/m, (_m, spec) => {
      return `window.__PORTAL_MODULES__[${JSON.stringify(url)}]={${parseExportBindings(spec)}};`;
    });

    return `window.__PORTAL_FACTORIES__[${JSON.stringify(url)}]=function(){${importLine}${code}};`;
  };

  const chunkFactories = chunks.map(buildChunkFactory).filter(Boolean).join("\n");

  // Transform the entry: resolve its static imports the same way, rewrite
  // dynamic chunk imports to resolve from the factory map, and publish its
  // exports to the registry (chunks that import from the entry need them).
  let entry = readFileSync(entryPath, "utf8");

  let entryImportLine = "";
  entry = entry.replace(/^import\{([^}]*)\}from"([^"]+)";?/m, (_m, spec, from) => {
    entryImportLine = `const {${parseImportBindings(spec)}}=__portalRequire(${JSON.stringify(resolveDepUrl(from))});`;
    return "";
  });

  // dynamic import(`./routes-X.js`) -> Promise.resolve(__portalChunk(...))
  entry = entry.replace(/import\(`\.\/([^`]+\.js)`\)/g, (_m, name) => {
    const match = chunks.find((url) => url.endsWith(name));
    const key = match ? JSON.stringify(match) : JSON.stringify("/assets/" + name);
    return `Promise.resolve(__portalChunk(${key}))`;
  });

  entry = entry.replace(/export\{([^}]*)\};?\s*$/m, (_m, spec) => {
    return `window.__PORTAL_EXPORTS__={${parseExportBindings(spec)}};`;
  });

  // Escape any literal `</script` inside the JS so the inline <script>
  // tag cannot be prematurely closed by the HTML parser. The TanStack
  // SSR serialization code embeds `</script>` strings in template
  // literals; `<\/script` is identical in JS string semantics.
  const escapeScriptClosers = (code) => code.replace(/<\/script/gi, "<\\/script");

  const inlineModule = [
    `(function(){`,
    `"use strict";`,
    `window.__PORTAL_EXPORTS__={};`,
    `window.__PORTAL_FACTORIES__={};`,
    `window.__PORTAL_MODULES__={};`,
    `function __portalRequire(u){if(u in window.__PORTAL_MODULES__)return window.__PORTAL_MODULES__[u];var f=window.__PORTAL_FACTORIES__[u];if(typeof f==="function"){f();}return window.__PORTAL_MODULES__[u];}`,
    `function __portalChunk(u){return Promise.resolve(__portalRequire(u));}`,
    escapeScriptClosers(chunkFactories),
    escapeScriptClosers(entryImportLine + entry),
    // Publish the entry's exports AFTER it runs, so chunks that statically
    // import from the entry (single-chunk builds) resolve them lazily.
    `window.__PORTAL_MODULES__[${JSON.stringify(entryHref)}]=window.__PORTAL_EXPORTS__;`,
    `})();`,
  ].join("\n");

  // ---- Syntax safety check -----------------------------------------
  // A broken inline module (e.g. a leftover static import inside the IIFE)
  // silently kills hydration - the page renders but every button is dead.
  // Validate with node --check so a bad build FAILS here instead of
  // shipping to production.
  try {
    const tmpCheck = join(tmpdir(), "portal-inline-check.mjs");
    writeFileSync(tmpCheck, inlineModule);
    execFileSync(process.execPath, ["--check", tmpCheck], { stdio: "pipe" });
    rmSync(tmpCheck, { force: true });
  } catch (err) {
    console.error("[inline-assets] FATAL: inline module failed JS syntax check. NOT writing index.html.");
    console.error(err.stderr ? err.stderr.toString().slice(0, 800) : err.message);
    process.exit(1);
  }

  // Replace the original module script tag with a unique PLACEHOLDER first.
  // (Function replacement so `$` sequences in the tag are not interpolated.)
  const PLACEHOLDER = "%%PORTAL_INLINE_MODULE%%";
  for (const t of moduleSrcTags) {
    html = html.replace(t, () => PLACEHOLDER);
  }

  // Neutralize /assets/*.js references inside the ORIGINAL inline
  // scripts (the $tsr hydration manifest + scroll-restoration). Replace
  // the URL STRINGS with a harmless empty data module URL - this keeps
  // the JS syntactically valid (unlike surgically emptying the
  // preloads[]/scripts[] arrays, which breaks on nested $R[n] brackets)
  // while ensuring the router never fetches the real chunk files (which
  // captive portals block). Our module is not in the html yet (only the
  // placeholder is), so this cannot corrupt the embedded chunk URLs.
  html = html.replace(/"\/assets\/[^"]+\.js"/g, '"data:application/javascript,"');

  // Remove <link rel="modulepreload"> tags - no longer needed.
  html = html.replace(/<link rel="modulepreload"[^>]*\/?>/g, "");

  // Finally swap the placeholder for the inline module.
  // CRITICAL: use a FUNCTION replacement, not a string - the minified
  // entry JS is full of `$` sequences and String.replace would interpret
  // $& / $' / $` / $$ patterns in the replacement string, exploding the
  // output size. A function return value is never $-interpolated.
  const inlineScript = `<script type="module">${inlineModule}</script>`;
  html = html.replace(PLACEHOLDER, () => inlineScript);
}

// ---- 4. Sanity checks ----------------------------------------------
const leftover = html.match(/href="\/assets\/[^"]+\.(css|js)"/g) || [];
if (leftover.length > 0) {
  console.error(`[inline-assets] Still external asset links after inlining: ${leftover.join(", ")}`);
  process.exit(1);
}
if (!html.includes("<style>")) {
  console.error("[inline-assets] No inlined <style> found - CSS inlining failed");
  process.exit(1);
}
if (!html.includes("__portalChunk") && !html.includes("<style>")) {
  console.error("[inline-assets] JS inlining appears to have failed");
  process.exit(1);
}

writeFileSync(htmlPath, html);
console.log(`[inline-assets] index.html is now self-contained (${(html.length / 1024).toFixed(0)} KB)`);
process.exit(0);
