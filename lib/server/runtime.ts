import { AsyncLocalStorage } from "node:async_hooks";
export interface RuntimeEnv {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  DATABASE_URL?: string;
  RESEND_API_KEY?: string;
  CONTACT_FROM?: string;
  SITE_URL?: string;
  RATE_LIMIT_SALT?: string;
  OWNER_PRIVATE_MODE?: string;
  ADMIN_AUTH_MODE?: string;
  ADMIN_USER_ID?: string;
  IDENTITY_PROXY_SECRET?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  CRON_SECRET?: string;
  CONTACT_RATE_LIMIT_PER_HOUR?: string;
}
const scope = new AsyncLocalStorage<RuntimeEnv>();
const transportScope = new AsyncLocalStorage<typeof fetch>();
export function withRuntime<T>(
  env: RuntimeEnv,
  fn: () => T,
  outboundFetch?: typeof fetch,
): T {
  return scope.run(env, () =>
    outboundFetch ? transportScope.run(outboundFetch, fn) : fn(),
  );
}
export function runtime(): RuntimeEnv {
  return scope.getStore() ?? (process.env as RuntimeEnv);
}
// External side effects use the transport supplied by the Worker entry, rather
// than a fetch wrapper installed later for framework rendering and caching.
// Standalone Next and tests retain their normal global fetch implementation.
export function runtimeFetch(): typeof fetch {
  return transportScope.getStore() ?? globalThis.fetch;
}
