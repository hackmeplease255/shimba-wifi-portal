import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// The SSR HTML shell is deterministic: every dynamic value (voucher codes,
// packages, payment status, URL params like ?mac=&router=) is rendered and
// read CLIENT-SIDE after hydration, so the server output is byte-identical
// apart from TanStack's internal hydration timestamp. Without a cache header
// Vercel serves it with `Cache-Control: max-age=0` and every phone that hits
// the hotspot portal triggers a full serverless cold start — the 2-6s blank
// wait (and occasional "plain text" when the function stalls) customers see.
// Caching the shell makes repeat visits instant from the browser cache and
// lets Vercel's CDN absorb repeat URL hits without re-running the function.
// Never cache error responses.
function applyHtmlCacheHeaders(response: Response): Response {
  if (response.status === 200) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=600, stale-while-revalidate=86400",
      );
    }
  }
  return response;
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applyHtmlCacheHeaders(normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
