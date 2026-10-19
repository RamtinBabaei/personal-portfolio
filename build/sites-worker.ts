import { protectAdminRequest } from "../lib/server/admin-access";
import { drainNotifications } from "../lib/server/notifications";
import { getStore } from "../lib/server/store";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { withRuntime } from "../lib/server/runtime";

// Capture before the first framework request and retain across development HMR.
const outboundKey = Symbol.for("ramtin.portfolio.outboundFetch");
const globals = globalThis as typeof globalThis & { [key: symbol]: unknown };
const outboundFetch = (globals[outboundKey] ??=
  globalThis.fetch.bind(globalThis)) as typeof fetch;

const sitesWorker = {
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    const job = withRuntime(
      env,
      async () =>
        drainNotifications({
          store: await getStore(),
          env,
          fetcher: outboundFetch,
          now: Date.now(),
        }),
      outboundFetch,
    );
    ctx.waitUntil(job);
    await job;
  },
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    const denied = await protectAdminRequest(request, env);
    if (denied) return denied;
    const url = new URL(request.url);
    if (url.pathname === "/")
      return Response.redirect(new URL("/en", url), 307);

    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt)
            return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: "request_context_expired",
              message: "This request has expired. Please try again.",
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    let emailFetch = outboundFetch;
    if (import.meta.env.DEV) {
      const { default: createTransport } =
        await import("virtual:portfolio-local-email");
      emailFetch = createTransport(outboundFetch);
    }
    const response = await withRuntime(
      env,
      () =>
        runWithConnectorBinding(binding, () =>
          handler.fetch(request, env, ctx),
        ),
      emailFetch,
    );
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    if (
      !url.pathname.startsWith("/images/") &&
      !url.pathname.startsWith("/api/fonts/") &&
      !url.pathname.includes("/assets/")
    )
      headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default sitesWorker;
