// Development-only Worker -> Node HTTPS transport. Never shipped to the browser.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Agent, request as httpsRequest } from "node:https";
const target = "https://api.resend.com/emails";
const endpoint = "/__portfolio_dev/email";
const virtual = "virtual:portfolio-local-email";
const resolved = "\0" + virtual;
const local = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const addresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
export function createNodeEmailSender({ requestImpl = httpsRequest } = {}) {
  const agent = new Agent({
    keepAlive: true,
    maxSockets: 4,
    rejectUnauthorized: true,
  });
  return {
    agent,
    close() {
      agent.destroy();
    },
    send(url, init) {
      if (
        String(url) !== target ||
        init.method !== "POST" ||
        typeof init.body !== "string"
      )
        return Promise.reject(new Error("Invalid email transport target"));
      const payload = Buffer.from(init.body, "utf8");
      const input = new Headers(init.headers);
      if (payload.length > 131072)
        return Promise.reject(new Error("Email payload too large"));
      return new Promise((resolve, reject) => {
        let completed = false;
        let request;
        const finish = (error, response) => {
          if (completed) return;
          completed = true;
          init.signal?.removeEventListener("abort", abort);
          if (error) reject(error);
          else resolve(response);
        };
        const abort = () => {
          const error = new Error("Email request aborted");
          error.name = "AbortError";
          request?.destroy(error);
          finish(error);
        };
        if (init.signal?.aborted) {
          abort();
          return;
        }
        try {
          request = requestImpl(
            new URL(target),
            {
              method: "POST",
              agent,
              rejectUnauthorized: true,
              headers: {
                Authorization: input.get("Authorization") || "",
                "Content-Type": "application/json",
                "Idempotency-Key": input.get("Idempotency-Key") || "",
                "Content-Length": payload.length,
              },
            },
            (incoming) => {
              const chunks = [];
              let size = 0;
              incoming.on("data", (chunk) => {
                size += chunk.length;
                if (size > 65536) {
                  const error = new Error("Email response too large");
                  incoming.destroy(error);
                  request.destroy(error);
                  finish(error);
                } else chunks.push(chunk);
              });
              incoming.on("error", (error) => finish(error));
              incoming.on("end", () => {
                const headers = new Headers({
                  "Content-Type": "application/json",
                });
                if (incoming.headers["retry-after"])
                  headers.set(
                    "Retry-After",
                    String(incoming.headers["retry-after"]),
                  );
                finish(
                  null,
                  new Response(Buffer.concat(chunks), {
                    status: incoming.statusCode || 502,
                    headers,
                  }),
                );
              });
            },
          );
          request.on("error", (error) => finish(error));
          request.setTimeout(11000, () =>
            request.destroy(new Error("Email request timeout")),
          );
          init.signal?.addEventListener("abort", abort, { once: true });
          request.end(payload);
        } catch (error) {
          finish(error);
        }
      });
    },
  };
}
export function createLocalEmailFetch(fetcher, origin, token) {
  return (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    if (url !== "https://api.resend.com/emails" || method !== "POST")
      return fetcher(input, init);
    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
    headers.set("X-Portfolio-Email-Bridge", token);
    return fetcher(origin + "/__portfolio_dev/email", {
      ...init,
      method: "POST",
      headers,
      cache: "no-store",
    });
  };
}
export function localEmailTransport({ sender } = {}) {
  let server;
  let bridge;
  let enabled = false;
  let native = sender;
  const token = randomBytes(32).toString("hex");
  return {
    name: "portfolio-local-email",
    configResolved(config) {
      enabled = config.command === "serve";
    },
    resolveId(id) {
      if (id === virtual) {
        if (this.environment?.name === "client")
          throw new Error("Server-only email module");
        return resolved;
      }
    },
    load(id) {
      if (id !== resolved) return;
      if (this.environment?.name === "client")
        throw new Error("Server-only email module");
      if (!enabled)
        return "export default function(fetcher) { return fetcher; }";
      const address = bridge?.address();
      if (!address || typeof address === "string")
        throw new Error("Email bridge server is not listening");
      return (
        "const create = " +
        createLocalEmailFetch.toString() +
        ";export default function(fetcher){return create(fetcher," +
        JSON.stringify("http://127.0.0.1:" + address.port) +
        "," +
        JSON.stringify(token) +
        ");}"
      );
    },
    async configureServer(viteServer) {
      server = viteServer;
      native ??= createNodeEmailSender();
      server.config.logger.info(
        "Local email transport: node:https (development only)",
      );
      server.httpServer?.once("close", () => {
        bridge?.closeAllConnections();
        bridge?.close();
        native.close();
      });
      bridge = createServer((request, response) => {
        const next = () => {
          response.statusCode = 404;
          response.end();
        };
        if (request.url?.split("?")[0] !== endpoint) return next();
        void (async () => {
          const deny = (status) => {
            response.statusCode = status;
            response.end();
          };
          let authority;
          try {
            authority = new URL("http://" + request.headers.host);
          } catch {
            return deny(403);
          }
          const supplied = Buffer.from(
            String(request.headers["x-portfolio-email-bridge"] || ""),
          );
          const expected = Buffer.from(token);
          if (
            !addresses.has(request.socket.remoteAddress) ||
            !local.has(authority.hostname) ||
            authority.port !== String(bridge.address().port) ||
            (request.headers.origin &&
              request.headers.origin !== authority.origin) ||
            supplied.length !== expected.length ||
            !timingSafeEqual(supplied, expected)
          )
            return deny(403);
          if (request.method !== "POST") return deny(405);
          if (!request.headers["content-type"]?.includes("application/json"))
            return deny(415);
          const chunks = [];
          let size = 0;
          for await (const chunk of request) {
            size += chunk.length;
            if (size > 131072) return deny(413);
            chunks.push(chunk);
          }
          const body = Buffer.concat(chunks).toString("utf8");
          try {
            JSON.parse(body);
          } catch {
            return deny(400);
          }
          const controller = new AbortController();
          const close = () => {
            if (!response.writableEnded) controller.abort();
          };
          response.once("close", close);
          try {
            const result = await native.send(target, {
              method: "POST",
              body,
              headers: {
                Authorization: request.headers.authorization || "",
                "Idempotency-Key": request.headers["idempotency-key"] || "",
                "Content-Type": "application/json",
              },
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(11000),
              ]),
            });
            response.statusCode = result.status;
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            if (result.headers.has("Retry-After"))
              response.setHeader(
                "Retry-After",
                result.headers.get("Retry-After"),
              );
            response.end(Buffer.from(await result.arrayBuffer()));
          } catch (error) {
            console.error("Local email transport failed", {
              code: error instanceof Error ? error.name : "UnknownError",
            });
            if (!response.destroyed) {
              response.statusCode = 502;
              response.setHeader("X-Portfolio-Transport-Error", "1");
              response.setHeader("Content-Type", "application/json");
              response.end('{"error":"LOCAL_EMAIL_TRANSPORT"}');
            }
          } finally {
            response.off("close", close);
          }
        })().catch(() => {
          if (!response.destroyed && !response.writableEnded) {
            response.statusCode = 502;
            response.end();
          }
        });
      });
      await new Promise((resolve, reject) => {
        bridge.once("error", reject);
        bridge.listen(0, "127.0.0.1", resolve);
      });
    },
  };
}
