import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitContact } from "@/lib/server/contact";
import {
  assertEmailConfiguration,
  notifyInquiry,
  notificationEmail,
} from "@/lib/server/notifications";
import { CONTACT_RECIPIENT } from "@/lib/contact";
import { contactOutcome } from "@/lib/contact-response";
import { testDatabase } from "../helpers/database";
const now = 1792393200000;
let database: Awaited<ReturnType<typeof testDatabase>>;
const form = () => ({
  name: "Client Example",
  email: "client@example.com",
  subject: "Website development",
  company: "شرکت نمونه",
  services: ["fullstack", "backend"],
  budget: "undecided",
  message: "A new website with a customer dashboard and an API.",
  website: "",
  idempotencyKey: crypto.randomUUID(),
  startedAt: now - 5000,
});
const request = (body: unknown, origin = "https://portfolio.test") =>
  new Request("https://portfolio.test/api/contact", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const fetcher = vi.fn<typeof fetch>();
const deps = () => ({
  store: database.store,
  env: {
    RESEND_API_KEY: "synthetic-not-a-real-key",
    CONTACT_FROM: "Ramtin <contact@example.com>",
    RATE_LIMIT_SALT: "test-salt",
  },
  fetcher,
  now,
});
const count = () =>
  Number(database.db.prepare("SELECT count(*) AS n FROM inquiries").get()!.n);
beforeEach(async () => {
  database = await testDatabase();
  fetcher
    .mockReset()
    .mockImplementation(async () =>
      Response.json({ id: "provider-fixture-1" }),
    );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  database.db.close();
  vi.restoreAllMocks();
});
describe("five-field contact email without an admin dashboard", () => {
  it("sends all five values to Ramtin and acknowledges provider acceptance only after saving it", async () => {
    const input = form();
    const response = await submitContact(request(input), deps());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      accepted: true,
      sent: true,
      emailStatus: "accepted",
      providerId: "provider-fixture-1",
    });
    const row = (await database.store.inquiry(input.idempotencyKey))!;
    expect(row.status).toBe("sent");
    expect(row.providerId).toBe("provider-fixture-1");
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const email = JSON.parse(init!.body as string);
    expect(email.to).toEqual([CONTACT_RECIPIENT]);
    expect(email.reply_to).toBe(input.email);
    for (const part of [
      input.name,
      input.email,
      input.company,
      "Full-Stack Development",
      "Backend & API Development",
      input.message,
    ]) {
      expect(email.text).toContain(part);
      expect(email.html).toContain(part.replace(/&/g, "&amp;"));
    }
    expect(new Headers(init!.headers).get("Idempotency-Key")).toBe(
      "inquiry-" + input.idempotencyKey,
    );
  });
  it.each([
    { email: "invalid" },
    { name: "X" },
    { services: [] },
    { services: ["backend", "backend"] },
    { services: ["made-up"] },
    { message: "short" },
    { company: "a".repeat(161) },
    { name: "a\r\nb" },
    { message: "a".repeat(5001) },
    { to: "attacker@example.com" },
    { from: "attacker@example.com" },
  ])("rejects invalid fields/overrides %j", async (patch) => {
    expect(
      (await submitContact(request({ ...form(), ...patch }), deps())).status,
    ).toBe(422);
    expect(count()).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects wrong origin, spam trap, future/too-fast/stale timestamps before sending", async () => {
    expect(
      (await submitContact(request(form(), "https://evil.test"), deps()))
        .status,
    ).toBe(403);
    for (const patch of [
      { website: "spam" },
      { startedAt: now + 1 },
      { startedAt: now - 100 },
      { startedAt: now - 86400001 },
    ])
      expect(
        (await submitContact(request({ ...form(), ...patch }), deps())).status,
      ).toBe(400);
    expect(count()).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects invalid content type, JSON and oversized payloads", async () => {
    const make = (body: string, type: string) =>
      new Request("https://portfolio.test/api/contact", {
        method: "POST",
        headers: { Origin: "https://portfolio.test", "Content-Type": type },
        body,
      });
    expect((await submitContact(make("{}", "text/plain"), deps())).status).toBe(
      415,
    );
    expect(
      (await submitContact(make("{broken", "application/json"), deps())).status,
    ).toBe(400);
    expect(
      (await submitContact(make("x".repeat(40001), "application/json"), deps()))
        .status,
    ).toBe(413);
    expect(count()).toBe(0);
  });
  it("stores the inquiry for automatic retry without claiming email acceptance when configuration is absent", async () => {
    const d = deps();
    d.env.RESEND_API_KEY = "";
    const response = await submitContact(request(form()), d);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      stored: true,
      emailStatus: "pending",
      automaticRetry: true,
    });
    expect(count()).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(() =>
      assertEmailConfiguration({
        ...d.env,
        RESEND_API_KEY: "fake",
        CONTACT_FROM: "Ramtin <ramtin.babaei2002@gmail.com>",
      }),
    ).toThrow("verified sending domain");
  });
  it("always uses the fixed owner recipient, regardless of an old CONTACT_TO setting", async () => {
    const input = form();
    const d = {
      ...deps(),
      env: { ...deps().env, CONTACT_TO: "wrong@example.com" },
    };
    expect((await submitContact(request(input), d)).status).toBe(200);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).to).toEqual([
      CONTACT_RECIPIENT,
    ]);
  });
  it("keeps HTML escaped and excludes old private workflow data", async () => {
    const input = {
      ...form(),
      name: "Client <script>",
      company: "<img src=x>",
      message: "<script>alert('x')</script> some project requirements",
    };
    await submitContact(request(input), deps());
    const row = (await database.store.inquiry(input.idempotencyKey))!;
    row.privateNotes = "PRIVATE-SECRET";
    row.meetingNotes = "PRIVATE-MEETING";
    row.nextAction = "PRIVATE-ACTION";
    const payload = notificationEmail(row, deps().env);
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("<script>");
    expect(JSON.stringify(payload)).not.toContain("PRIVATE-");
  });
  it("allows an optional empty organization and includes a clear placeholder", async () => {
    expect(
      (await submitContact(request({ ...form(), company: "" }), deps())).status,
    ).toBe(200);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).text).toContain(
      "Organization: Not provided",
    );
  });
  it("reuses the same record/provider acceptance for duplicate submissions", async () => {
    const input = form();
    const a = await submitContact(request(input), deps());
    const b = await submitContact(
      request({ ...input, startedAt: now - 3000 }),
      deps(),
    );
    expect(((await a.json()) as { reference: string }).reference).toBe(
      ((await b.json()) as { reference: string }).reference,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(count()).toBe(1);
    expect(
      (
        await submitContact(
          request({
            ...input,
            message: "A changed website request with sufficient detail.",
          }),
          deps(),
        )
      ).status,
    ).toBe(409);
  });
  it("never reports success for concurrent sends until that send has completed", async () => {
    let release!: () => void;
    let entered!: () => void;
    const pending = new Promise<void>((r) => {
      release = r;
    });
    const started = new Promise<void>((r) => {
      entered = r;
    });
    fetcher.mockImplementation(async () => {
      entered();
      await pending;
      return Response.json({ id: "concurrent-id" });
    });
    const input = form();
    const first = submitContact(request(input), deps());
    await started;
    const second = await submitContact(request(input), deps());
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ error: "RETRY_NOT_READY" });
    release();
    expect((await first).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(count()).toBe(1);
  });
  it.each(["rejection", "network", "invalid-success", "transport"])(
    "returns failure and preserves the request for %s",
    async (mode) => {
      fetcher.mockImplementation(async () => {
        if (mode === "network") throw new TypeError("sensitive error");
        if (mode === "rejection")
          return Response.json(
            { message: "private provider details" },
            { status: 403 },
          );
        if (mode === "transport")
          return new Response("private", {
            status: 502,
            headers: { "X-Portfolio-Transport-Error": "1" },
          });
        return Response.json({ unrelated: true });
      });
      const input = form();
      const response = await submitContact(request(input), deps());
      expect(response.status).toBe(202);
      const text = await response.text();
      expect(text).not.toContain('"accepted":true');
      expect(text).not.toContain("private provider");
      const saved = (await database.store.inquiry(input.idempotencyKey))!;
      expect(saved.status).toBe("failed");
      expect(saved.providerId).toBeNull();
      expect(saved.notificationPayload).not.toBe("");
      expect(saved.notificationAttempts).toBe(1);
    },
  );
  it("retries a due failure with the identical body and key, and preserves it across config changes", async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const input = form();
    expect((await submitContact(request(input), deps())).status).toBe(202);
    expect((await submitContact(request(input), deps())).status).toBe(409);
    const later = {
      ...deps(),
      now: now + 61000,
      env: { ...deps().env, CONTACT_FROM: "Changed <changed@example.com>" },
    };
    expect((await submitContact(request(input), later)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]!.body).toBe(fetcher.mock.calls[1][1]!.body);
    expect(
      new Headers(fetcher.mock.calls[0][1]!.headers).get("Idempotency-Key"),
    ).toBe(
      new Headers(fetcher.mock.calls[1][1]!.headers).get("Idempotency-Key"),
    );
  });
  it("distinguishes provider acceptance from uncertain database recording", async () => {
    const input = form();
    const d = deps();
    d.store = { ...d.store, finishNotification: vi.fn(async () => false) };
    const response = await submitContact(request(input), d);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: "ACCEPTED_STORAGE_UNCERTAIN",
    });
    expect(d.store.finishNotification).toHaveBeenCalledTimes(1);
    expect((await database.store.inquiry(input.idempotencyKey))?.status).toBe(
      "sending",
    );
  });
  it("bounds retries and stops before the provider duplicate-prevention window expires", async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 500 }));
    const input = form();
    await submitContact(request(input), deps());
    const row = (await database.store.inquiry(input.idempotencyKey))!;
    database.db
      .prepare(
        "UPDATE inquiries SET firstNotificationAt=?,nextNotificationAt=0 WHERE id=?",
      )
      .run(now - 23 * 3600000, row.id);
    expect((await submitContact(request(input), deps())).status).toBe(409);
    expect(fetcher).toHaveBeenCalledTimes(1);
    database.db
      .prepare(
        "UPDATE inquiries SET firstNotificationAt=?,notificationAttempts=6 WHERE id=?",
      )
      .run(now, row.id);
    await expect(notifyInquiry(row.id, deps())).rejects.toMatchObject({
      code: "REVIEW_REQUIRED",
    });
  });
  it("rate limits after five submissions", async () => {
    for (let i = 0; i < 5; i++)
      expect((await submitContact(request(form()), deps())).status).toBe(200);
    const response = await submitContact(request(form()), deps());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(count()).toBe(5);
  });
  it("never accepts a failed database insertion", async () => {
    const d = deps();
    d.store = {
      ...d.store,
      createInquiry: vi.fn(async () => {
        throw new Error("DB failed");
      }),
    };
    expect((await submitContact(request(form()), d)).status).toBe(500);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe("frontend success contract", () => {
  const accepted = {
    accepted: true,
    sent: true,
    emailStatus: "accepted",
    reference: "00000000-0000-4000-8000-000000000001",
    providerId: "provider-id",
  };
  it("requires explicit provider acceptance, receipt and provider ID before resetting the form", () => {
    expect(contactOutcome(200, accepted)).toBe("sent");
    for (const [status, body] of [
      [202, { accepted: true, sent: false }],
      [200, { ...accepted, providerId: null }],
      [200, { ...accepted, reference: "invalid" }],
      [200, { ...accepted, sent: false }],
      [502, accepted],
      [200, {}],
      [200, null],
    ] as const)
      expect(contactOutcome(status, body)).not.toBe("sent");
  });
  it.each([
    [503, "EMAIL_UNCONFIGURED", "unavailable"],
    [502, "EMAIL_SEND_FAILED", "failure"],
    [429, "RATE_LIMITED", "rate"],
    [409, "RETRY_NOT_READY", "pending"],
    [503, "ACCEPTED_STORAGE_UNCERTAIN", "pending"],
    [409, "REVIEW_REQUIRED", "review"],
    [422, "VALIDATION_ERROR", "validation"],
  ])("classifies %s %s", (status, error, outcome) => {
    expect(contactOutcome(Number(status), { error })).toBe(outcome);
  });
});
