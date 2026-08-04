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
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

  // Read + transform each chunk: strip its static `import{...}from"..."`,
  // wrap the code in a lazy factory function that destructures the needed
  // bindings from window.__PORTAL_EXPORTS__ (populated by the entry) and
  // returns the module's exported members. The factory is invoked lazily
  // by __portalChunk(), which the rewritten dynamic import calls.
  const chunkFactories = chunks
    .map((url) => {
      const file = join(staticDir, url.replace(/^\//, ""));
      if (!existsSync(file)) return null;
      let code = readFileSync(file, "utf8");

      const importMatch = code.match(/^import\{([^}]*)\}from"[^"]+";?/);
      let bindings = "";
      if (importMatch) {
        bindings = importMatch[1]
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
        code = code.replace(/^import\{[^}]*\}from"[^"]+";?/, "");
      }

      // export{Oe as component}; -> return {component:Oe};
      code = code.replace(/export\{([^}]*)\};?\s*$/, (_m, spec) => {
        const entries = spec
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
        return `return {${entries}};`;
      });

      const factoryBody = bindings
        ? `const {${bindings}}=window.__PORTAL_EXPORTS__;${code}`
        : code;
      return `window.__PORTAL_FACTORIES__[${JSON.stringify(url)}]=function(){${factoryBody}};`;
    })
    .filter(Boolean)
    .join("\n");

  // Transform the entry: turn its trailing `export{...}` into a
  // window.__PORTAL_EXPORTS__ object, and rewrite dynamic chunk imports
  // to resolve from the lazy factory map.
  let entry = readFileSync(entryPath, "utf8");
  entry = entry.replace(/export\{([^}]*)\};?\s*$/, (_m, spec) => {
    const entries = spec
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
    return `window.__PORTAL_EXPORTS__={${entries}};`;
  });
  // dynamic import(`./routes-X.js`) -> Promise.resolve(__portalChunk(...))
  entry = entry.replace(/import\(`\.\/([^`]+\.js)`\)/g, (_m, name) => {
    const match = chunks.find((url) => url.endsWith(name));
    const key = match ? JSON.stringify(match) : JSON.stringify("/assets/" + name);
    return `Promise.resolve(__portalChunk(${key}))`;
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
    `function __portalChunk(u){var m=window.__PORTAL_FACTORIES__[u];if(typeof m==="function"){m=m();window.__PORTAL_FACTORIES__[u]=m;}return m;}`,
    escapeScriptClosers(chunkFactories),
    escapeScriptClosers(entry),
    `})();`,
  ].join("\n");

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
