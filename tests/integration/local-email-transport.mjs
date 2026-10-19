// Isolated real Worker -> private Node HTTP bridge -> native ClientRequest.
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createNodeEmailSender,
  localEmailTransport,
} from "../../build/local-email-plugin.mjs";
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve("wrangler"))("miniflare");
const publicServer = new EventEmitter();
const seen = [];
let mode = "accepted";
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  seen.push({
    body: Buffer.concat(chunks).toString("utf8"),
    headers: req.headers,
  });
  res.setHeader("Content-Type", "application/json");
  if (mode === "hang") return;
  if (mode === "rejected") {
    res.statusCode = 403;
    res.end('{"name":"validation_error"}');
    return;
  }
  if (mode === "oversize") {
    res.end("x".repeat(66000));
    return;
  }
  res.end('{"id":"native-fixture-email"}');
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const providerUrl = "http://127.0.0.1:" + provider.address().port;
const native = createNodeEmailSender({
  requestImpl(_url, options, callback) {
    assert.equal(options.rejectUnauthorized, true);
    return httpRequest(providerUrl, { ...options, agent: undefined }, callback);
  },
});
assert.equal(native.agent.options.rejectUnauthorized, true);
const plugin = localEmailTransport({ sender: native });
plugin.configResolved({ command: "serve" });
await plugin.configureServer({
  config: { logger: { info() {} } },
  httpServer: publicServer,
});
const id = plugin.resolveId.call(
  { environment: { name: "rsc" } },
  "virtual:portfolio-local-email",
);
const source = plugin.load.call({ environment: { name: "rsc" } }, id);
const bridgeOrigin = source.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
const token = source.match(/"([a-f0-9]{64})"/)[1];
const headers = {
  Authorization: "Bearer synthetic-not-a-real-key",
  "Content-Type": "application/json",
  "Idempotency-Key": "fixture-stable-key",
};
const payload = JSON.stringify({
  from: "test@example.com",
  to: ["ramtin.babaei2002@gmail.com"],
  text: "تست فارسی & UTF-8 ".repeat(2000),
  html: "<p>Test</p>",
});
const originalFetch = globalThis.fetch;
let mf;
try {
  assert.throws(
    () => plugin.load.call({ environment: { name: "client" } }, id),
    /Server-only/,
  );
  assert.throws(
    () =>
      plugin.resolveId.call(
        { environment: { name: "client" } },
        "virtual:portfolio-local-email",
      ),
    /Server-only/,
  );
  const worker =
    source.replace(
      "export default function(fetcher)",
      "function createTransport(fetcher)",
    ) +
    '\nexport default {async fetch(request){const input=await request.json();return createTransport(globalThis.fetch)("https://api.resend.com/emails",{method:"POST",headers:input.headers,body:input.body});}};';
  mf = new Miniflare({
    modules: [{ type: "ESModule", path: "worker.mjs", contents: worker }],
    cf: false,
    host: "127.0.0.1",
    port: 0,
    inspectorPort: 0,
    compatibilityDate: "2026-05-15",
  });
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.resend.com"))
      throw new Error("Framework fetch must not handle email");
    return originalFetch(input, init);
  };
  const send = () =>
    mf.dispatchFetch("http://worker.test/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, body: payload }),
    });
  const accepted = await send();
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).id, "native-fixture-email");
  assert.equal(seen[0].body, payload);
  assert.equal(
    seen[0].headers["content-length"],
    String(Buffer.byteLength(payload)),
  );
  assert.equal(seen[0].headers["idempotency-key"], headers["Idempotency-Key"]);
  assert.equal(seen[0].headers["x-portfolio-email-bridge"], undefined);
  const privateUrl = bridgeOrigin + "/__portfolio_dev/email";
  const internal = { ...headers, "X-Portfolio-Email-Bridge": token };
  assert.equal(
    (
      await originalFetch(privateUrl, {
        method: "POST",
        headers,
        body: payload,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await originalFetch(privateUrl, {
        method: "POST",
        headers: { ...internal, Origin: "https://evil.test" },
        body: payload,
      })
    ).status,
    403,
  );
  const wrongHostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      privateUrl,
      { method: "POST", headers: { ...internal, Host: "remote.example" } },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.end(payload);
  });
  assert.equal(wrongHostStatus, 403);
  assert.equal(
    (await originalFetch(privateUrl, { method: "GET", headers: internal }))
      .status,
    405,
  );
  assert.equal(
    (
      await originalFetch(privateUrl, {
        method: "POST",
        headers: { ...internal, "Content-Type": "text/plain" },
        body: payload,
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await originalFetch(privateUrl, {
        method: "POST",
        headers: internal,
        body: "{invalid",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await originalFetch(privateUrl, {
        method: "POST",
        headers: internal,
        body: "x".repeat(131073),
      })
    ).status,
    413,
  );
  mode = "rejected";
  const rejected = await send();
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.has("X-Portfolio-Transport-Error"), false);
  mode = "oversize";
  const oversized = await send();
  assert.equal(oversized.status, 502);
  assert.equal(oversized.headers.get("X-Portfolio-Transport-Error"), "1");
  mode = "hang";
  await assert.rejects(
    native.send("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(200),
    }),
    /abort/i,
  );
  await assert.rejects(
    native.send("https://wrong.example/emails", {
      method: "POST",
      headers,
      body: payload,
    }),
    /Invalid email transport target/,
  );
  const project = fileURLToPath(new URL("../../", import.meta.url));
  const js = readdirSync(path.join(project, "dist"), {
    recursive: true,
  }).filter((f) => /\.m?js$/.test(f));
  for (const file of js) {
    const content = readFileSync(path.join(project, "dist", file), "utf8");
    for (const marker of [
      "/__portfolio_dev/email",
      "X-Portfolio-Email-Bridge",
      "virtual:portfolio-local-email",
    ])
      assert.equal(
        content.toLowerCase().includes(marker.toLowerCase()),
        false,
        file + " leaked private transport marker",
      );
  }
  console.log(
    "PASS: Worker -> token-protected Node bridge -> native HTTP fixture, exact UTF-8 body/length/key, no browser module, target/Host/Origin/token/method/type/size guards, provider rejection, response bounds, cancellation, TLS verification settings and production isolation. External TLS/email not sent.",
  );
} finally {
  globalThis.fetch = originalFetch;
  if (mf) await mf.dispose();
  publicServer.emit("close");
  provider.closeAllConnections();
  await new Promise((resolve) => provider.close(resolve));
}
