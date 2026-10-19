import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { submitContact } from "@/lib/server/contact";
import {
  drainNotifications,
  notificationEmail,
} from "@/lib/server/notifications";
import { inquiryDetails } from "@/lib/contact-record";
import { inquiryQuerySchema, inquiryView } from "@/lib/inquiries";
import { contactOutcome } from "@/lib/contact-response";
import { testDatabase } from "../helpers/database";
const now = 1792393200000;
let database: Awaited<ReturnType<typeof testDatabase>>;
const input = () => ({
  name: "Client Example",
  email: "client@example.com",
  company: "شرکت نمونه",
  services: ["fullstack", "backend"],
  budget: "undecided",
  subject: "Project inquiry",
  message:
    "خط اول: طراحی سایت فارسی\n\nLine 3: <script>alert('x')</script> & an API.\r\nLast line.",
  website: "",
  idempotencyKey: crypto.randomUUID(),
  startedAt: now - 5000,
});
const request = (body: unknown) =>
  new Request("https://portfolio.test/api/contact", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
const fetcher = vi.fn<typeof fetch>();
const deps = () => ({
  store: database.store,
  env: {
    RESEND_API_KEY: "synthetic-not-a-real-key",
    CONTACT_FROM: "Ramtin <contact@example.com>",
  },
  fetcher,
  now,
});
beforeEach(async () => {
  database = await testDatabase();
  fetcher
    .mockReset()
    .mockImplementation(async () => Response.json({ id: "accepted-test" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  database.db.close();
  vi.restoreAllMocks();
});
describe("real form messages and unattended outbox processing", () => {
  it("stores the exact complete message and renders UTF-8, blank lines, HTML escaping and a visible reference without the CLI", async () => {
    const data = input();
    expect((await submitContact(request(data), deps())).status).toBe(200);
    const row = (await database.store.inquiry(data.idempotencyKey))!;
    expect(row.message).toBe(data.message);
    expect(JSON.parse(row.details).description).toBe(data.message);
    const email = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(
      email.text.startsWith(
        "Project Description / Client Message:\n" + data.message,
      ),
    ).toBe(true);
    expect(email.html).toContain("خط اول: طراحی سایت فارسی<br><br>Line 3:");
    expect(email.html).toContain(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; an API.<br>Last line.",
    );
    expect(email.html).not.toContain("<script>");
    expect(
      email.html.indexOf("Project Description / Client Message"),
    ).toBeLessThan(email.html.indexOf(">Client<"));
    expect(email.subject).toContain(row.id);
    expect(email.html).toContain("Inquiry Reference ID: " + row.id);
    const page = await database.store.queryInquiries(
      inquiryQuerySchema.parse({ q: "خط اول" }),
    );
    expect(page.items).toHaveLength(1);
    expect(inquiryDetails(inquiryView(page.items[0])).description).toBe(
      data.message,
    );
    expect(inquiryView(row)).not.toHaveProperty("notificationPayload");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("uses the saved message if legacy metadata has an empty description", async () => {
    const data = input();
    await submitContact(request(data), deps());
    const row = (await database.store.inquiry(data.idempotencyKey))!;
    row.details = JSON.stringify({
      company: "",
      services: [],
      budget: "undecided",
      description: "   ",
    });
    expect(notificationEmail(row, deps().env).text).toContain(data.message);
    expect(inquiryDetails(row).description).toBe(data.message);
  });
  it("automatically retries a stored failure using the exact provider body and key, then skips accepted mail", async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const data = input();
    const response = await submitContact(request(data), deps());
    expect(response.status).toBe(202);
    expect(contactOutcome(202, await response.json())).toBe("queued");
    expect(
      await drainNotifications({ ...deps(), now: now + 30000 }),
    ).toMatchObject({ checked: 0 });
    expect(
      await drainNotifications({ ...deps(), now: now + 61000 }),
    ).toMatchObject({ accepted: 1 });
    expect(fetcher.mock.calls[0][1]!.body).toBe(fetcher.mock.calls[1][1]!.body);
    expect(
      new Headers(fetcher.mock.calls[0][1]!.headers).get("Idempotency-Key"),
    ).toBe(
      new Headers(fetcher.mock.calls[1][1]!.headers).get("Idempotency-Key"),
    );
    expect((await database.store.inquiry(data.idempotencyKey))?.status).toBe(
      "sent",
    );
    expect(
      await drainNotifications({ ...deps(), now: now + 120000 }),
    ).toMatchObject({ checked: 0 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("recovers after missing configuration without losing the form", async () => {
    const data = input();
    const d = deps();
    d.env.RESEND_API_KEY = "";
    expect((await submitContact(request(data), d)).status).toBe(202);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await database.store.inquiry(data.idempotencyKey))?.message).toBe(
      data.message,
    );
    expect(await drainNotifications(deps())).toMatchObject({ accepted: 1 });
  });
  it("leases an inquiry so concurrent automatic processors cannot both dispatch it", async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await submitContact(request(input()), deps());
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    fetcher.mockImplementation(async () => {
      await gate;
      return Response.json({ id: "one-acceptance" });
    });
    const a = drainNotifications({ ...deps(), now: now + 61000 });
    const b = drainNotifications({ ...deps(), now: now + 61000 });
    await new Promise((r) => setTimeout(r, 10));
    release();
    const outcomes = await Promise.all([a, b]);
    expect(outcomes.reduce((n, r) => n + r.accepted, 0)).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("quarantines unsafe old retries so they cannot block newer safe inquiries", async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const old = input();
    await submitContact(request(old), deps());
    const row = (await database.store.inquiry(old.idempotencyKey))!;
    database.db
      .prepare(
        "UPDATE inquiries SET firstNotificationAt=?,nextNotificationAt=0 WHERE id=?",
      )
      .run(now - 23 * 3600000, row.id);
    fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await submitContact(request(input()), deps());
    expect(
      await drainNotifications({ ...deps(), now: now + 61000 }),
    ).toMatchObject({ checked: 2, review: 1, accepted: 1 });
    expect(
      (await database.store.findInquiry(row.id))?.lastNotificationError,
    ).toBe("REVIEW_REQUIRED");
    expect(
      await database.store.dueNotifications(now + 120000, 10),
    ).toHaveLength(0);
  });
  it("recovers a provider-accepted but uncertain database write inside the provider deduplication window", async () => {
    const data = input();
    const d = deps();
    d.store = { ...d.store, finishNotification: vi.fn(async () => false) };
    expect((await submitContact(request(data), d)).status).toBe(503);
    expect(
      await drainNotifications({ ...deps(), now: now + 61000 }),
    ).toMatchObject({ accepted: 1 });
    expect(fetcher.mock.calls[0][1]!.body).toBe(fetcher.mock.calls[1][1]!.body);
    expect(
      (await database.store.inquiry(data.idempotencyKey))?.providerId,
    ).toBe("accepted-test");
  });
  it.each([
    "not-json",
    "{}",
    JSON.stringify({
      to: ["other@example.com"],
      from: "Ramtin <contact@example.com>",
    }),
  ])(
    "quarantines corrupt frozen payload %s without contacting the provider",
    async (snapshot) => {
      fetcher.mockResolvedValueOnce(new Response(null, { status: 500 }));
      const data = input();
      await submitContact(request(data), deps());
      const row = (await database.store.inquiry(data.idempotencyKey))!;
      database.db
        .prepare(
          "UPDATE inquiries SET notificationPayload=?,nextNotificationAt=0 WHERE id=?",
        )
        .run(snapshot, row.id);
      expect(
        await drainNotifications({ ...deps(), now: now + 61000 }),
      ).toMatchObject({ review: 1, accepted: 0 });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(
        await database.store.dueNotifications(now + 120000, 10),
      ).toHaveLength(0);
    },
  );
});
