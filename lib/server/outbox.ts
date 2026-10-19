import { runtime, runtimeFetch } from "./runtime";
import { getStore } from "./store";
import { drainNotifications } from "./notifications";
import { HttpError, errorResponse } from "./http";

export async function authorizeCron(request: Request, secret?: string) {
  if (!secret || secret.length < 32)
    throw new HttpError(
      503,
      "CRON_UNCONFIGURED",
      "Server scheduler authentication is not configured.",
    );
  const candidate =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(secret),
  );
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(candidate),
    ))
  )
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "Scheduler authentication is required.",
    );
}
export async function processOutbox(request: Request) {
  try {
    await authorizeCron(request, runtime().CRON_SECRET);
    const result = await drainNotifications({
      store: await getStore(),
      env: runtime(),
      fetcher: runtimeFetch(),
      now: Date.now(),
    });
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
