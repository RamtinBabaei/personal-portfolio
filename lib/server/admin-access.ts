import { HttpError } from "./http";
import type { RuntimeEnv } from "./runtime";

// Portable hosting uses HTTP Basic over HTTPS, without browser-stored tokens.
// Sites hosting can explicitly select its existing gateway identity instead.
export async function adminIdentity(
  headers: Headers,
  env: RuntimeEnv,
  now = Date.now(),
) {
  if (env.ADMIN_AUTH_MODE === "sites") {
    const id = headers.get("oai-authenticated-user-id");
    if (env.ADMIN_USER_ID && id === env.ADMIN_USER_ID) return { userId: id };
    throw new HttpError(401, "UNAUTHORIZED", "Owner sign-in is required.");
  }
  if (env.ADMIN_AUTH_MODE === "proxy") {
    const id = headers.get("oai-authenticated-user-id");
    const email = headers.get("oai-authenticated-user-email");
    const timestamp = headers.get("x-portfolio-identity-timestamp");
    const signature = headers.get("x-portfolio-identity-signature");
    if (
      id &&
      email &&
      id === env.ADMIN_USER_ID &&
      timestamp &&
      /^\d+$/.test(timestamp) &&
      Math.abs(now - Number(timestamp)) < 60000 &&
      signature &&
      /^[a-f0-9]{64}$/i.test(signature) &&
      env.IDENTITY_PROXY_SECRET
    ) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.IDENTITY_PROXY_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const bytes = Uint8Array.from(signature.match(/../g)!, (v) =>
        parseInt(v, 16),
      );
      if (
        await crypto.subtle.verify(
          "HMAC",
          key,
          bytes,
          new TextEncoder().encode(`${timestamp}.${id}.${email}`),
        )
      )
        return { userId: id };
    }
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "A signed owner identity is required.",
    );
  }
  if (
    env.ADMIN_AUTH_MODE !== "basic" ||
    !env.ADMIN_USERNAME ||
    !env.ADMIN_PASSWORD ||
    env.ADMIN_PASSWORD.length < 32
  )
    throw new HttpError(
      503,
      "ADMIN_UNCONFIGURED",
      "Configure private administrator access on the server.",
    );
  const authorization = headers.get("authorization") || "";
  if (/^Basic /i.test(authorization)) {
    try {
      const supplied = atob(authorization.slice(6));
      const expected = env.ADMIN_USERNAME + ":" + env.ADMIN_PASSWORD;
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.ADMIN_PASSWORD),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(expected),
      );
      if (
        await crypto.subtle.verify(
          "HMAC",
          key,
          signature,
          new TextEncoder().encode(supplied),
        )
      )
        return { userId: env.ADMIN_USERNAME };
    } catch {}
  }
  throw new HttpError(
    401,
    "UNAUTHORIZED",
    "Private administrator credentials are required.",
  );
}

export const isAdminPath = (path: string) =>
  /^\/(en|fa)\/studio(?:\/|$)/.test(path) ||
  /^\/api\/studio(?:\/|$)/.test(path);

export async function protectAdminRequest(request: Request, env: RuntimeEnv) {
  if (!isAdminPath(new URL(request.url).pathname)) return null;
  if (
    env.ADMIN_AUTH_MODE === "basic" &&
    new URL(request.url).protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  )
    return new Response("HTTPS is required for administrator access.", {
      status: 403,
    });
  if (
    env.ADMIN_AUTH_MODE === "sites" &&
    !new URL(request.url).pathname.startsWith("/api/")
  )
    return null;
  try {
    await adminIdentity(request.headers, env);
    return null;
  } catch (error) {
    const known = error instanceof HttpError;
    return Response.json(
      { error: known ? error.code : "UNAUTHORIZED" },
      {
        status: known ? error.status : 401,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
          ...(env.ADMIN_AUTH_MODE === "basic"
            ? {
                "WWW-Authenticate":
                  'Basic realm="Ramtin private inquiries", charset="UTF-8"',
              }
            : {}),
        },
      },
    );
  }
}
