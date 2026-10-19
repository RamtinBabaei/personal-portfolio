import assert from "node:assert/strict";
import { startOutboxLoop } from "../../build/local-outbox-plugin.mjs";
import { verifyContact } from "../../scripts/verify-contact.mjs";
let ticks = 0;
const secret = "synthetic-private-cron-secret-0123456789";
const loop = startOutboxLoop({
  origin: "http://127.0.0.1:5173",
  secret,
  intervalMs: 10,
  report() {},
  async requester(url, init) {
    assert.equal(
      String(url),
      "http://127.0.0.1:5173/api/internal/contact-outbox",
    );
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer " + secret);
    ticks++;
    return new Response(null, { status: ticks === 1 ? 503 : 200 });
  },
});
await new Promise((resolve) => setTimeout(resolve, 75));
loop.stop();
assert.ok(
  ticks >= 2,
  "Development retries must run without a terminal dispatch command",
);
const stopped = ticks;
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(
  ticks,
  stopped,
  "Closed development servers must not retain retry timers",
);
let healthCalls = 0;
await verifyContact({
  report() {},
  async fetcher(url, init) {
    assert.equal(new URL(url).pathname, "/api/contact");
    assert.equal(init.method, "GET");
    assert.equal(init.body, undefined);
    healthCalls++;
    return Response.json({
      automaticNotifications: true,
      emailConfigured: true,
    });
  },
});
assert.equal(healthCalls, 1);
console.log(
  "PASS: automatic development retry timer, recovery after failure, cleanup and read-only contact:verify. Simulated requests only; no email sent.",
);
