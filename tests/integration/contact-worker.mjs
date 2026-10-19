// Actual built API + disposable D1/R2. The email provider is simulated.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sendTestInquiry } from "../../scripts/send-test-inquiry.mjs";
import { verifyContact } from "../../scripts/verify-contact.mjs";
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve("wrangler"))("miniflare");
const project = fileURLToPath(new URL("../../", import.meta.url));
const root = path.join(project, "dist/server");
let providerStatus = 200;
const calls = [];
const mf = new Miniflare({
  modules: readdirSync(root, { recursive: true })
    .filter((f) => /\.m?js$/.test(f))
    .sort((a, b) =>
      a === "index.js" ? -1 : b === "index.js" ? 1 : a.localeCompare(b),
    )
    .map((f) => ({ type: "ESModule", path: path.join(root, f) })),
  modulesRoot: root,
  cf: false,
  host: "127.0.0.1",
  port: 0,
  inspectorPort: 0,
  unsafeTriggerHandlers: true,
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: ["DB"],
  r2Buckets: ["BUCKET"],
  bindings: {
    RESEND_API_KEY: "synthetic-not-a-real-key",
    CONTACT_FROM: "Ramtin <test@example.com>",
    CONTACT_TO: "wrong@example.com",
    RATE_LIMIT_SALT: "isolated-integration-salt",
    ADMIN_AUTH_MODE: "basic",
    ADMIN_USERNAME: "ramtin",
    ADMIN_PASSWORD: "integration-private-password-0123456789",
    CRON_SECRET: "integration-private-cron-secret-0123456789",
  },
  async outboundService(request) {
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.method, "POST");
    const body = await request.text();
    const email = JSON.parse(body);
    assert.deepEqual(email.to, ["ramtin.babaei2002@gmail.com"]);
    assert.ok(
      ["visitor@example.com", "ramtin.babaei2002@gmail.com"].includes(
        email.reply_to,
      ),
    );
    for (const value of [
      "Full-Stack Development",
      "Backend & API Development",
      "Organization",
      "Project Description / Client Message",
    ])
      assert.ok(
        email.text.includes(value) || email.html.includes(value),
        value,
      );
    calls.push({ body, key: request.headers.get("Idempotency-Key") });
    return Response.json(
      providerStatus === 200
        ? { id: "fixture-email-" + calls.length }
        : { name: "validation_error" },
      { status: providerStatus },
    );
  },
});
try {
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync(path.join(project, "drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync(
      path.join(project, "drizzle", file),
      "utf8",
    ).split("--> statement-breakpoint"))
      if (sql.trim()) await db.prepare(sql).run();
  for (const lang of ["en", "fa"])
    for (const page of ["", "/work", "/about", "/contact"]) {
      const r = await mf.dispatchFetch("http://localhost/" + lang + page);
      assert.equal(r.status, 200, lang + page);
      const html = await r.text();
      assert.match(html, new RegExp('lang="' + lang + '"'));
      assert.doesNotMatch(html, /href="[^\"]*\/studio/);
      if (lang === "fa") assert.match(html, /dir="rtl"/);
      if (page === "/contact")
        assert.equal((html.match(/class="contact-question"/g) || []).length, 5);
    }
  for (const pathname of [
    "/studio",
    "/en/studio/projects",
    "/en/studio/preview/test",
    "/api/studio/entries",
    "/api/studio/media",
    "/signin-with-chatgpt",
    "/api/inquiries",
  ]) {
    assert.equal(
      (await mf.dispatchFetch("http://localhost" + pathname)).status,
      /^\/(en|fa)\/studio\//.test(pathname) ||
        pathname.startsWith("/api/studio/")
        ? 401
        : 404,
      pathname,
    );
  }
  assert.equal(
    (
      await mf.dispatchFetch("http://localhost/api/studio/inquiries", {
        method: "POST",
        body: "{}",
      })
    ).status,
    401,
  );
  const font = await mf.dispatchFetch(
    "http://localhost/api/fonts/manrope-latin.woff2",
  );
  assert.equal(font.status, 200);
  assert.equal(
    new TextDecoder().decode(
      new Uint8Array(await font.arrayBuffer()).slice(0, 4),
    ),
    "wOF2",
  );
  const input = () => ({
    name: "Integration Client",
    email: "visitor@example.com",
    company: "Synthetic organization",
    subject: "Integration website request",
    services: ["fullstack", "backend"],
    budget: "undecided",
    message:
      "درخواست پروژه فارسی با API\n\nMESSAGE-AUTO-01 — A complete project <description> & backend.",
    website: "",
    idempotencyKey: crypto.randomUUID(),
    startedAt: Date.now() - 5000,
  });
  const submit = (body) =>
    mf.dispatchFetch("http://localhost/api/contact", {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const first = input();
  const r = await submit(first);
  assert.equal(r.status, 200);
  const accepted = await r.json();
  assert.equal(accepted.sent, true);
  assert.equal(accepted.emailStatus, "accepted");
  assert.equal(accepted.providerId, "fixture-email-1");
  const saved = await db
    .prepare("SELECT * FROM inquiries WHERE id=?")
    .bind(accepted.reference)
    .first();
  assert.equal(saved.status, "sent");
  assert.equal(saved.providerId, accepted.providerId);
  assert.equal(saved.message, first.message);
  assert.equal(JSON.parse(saved.details).description, first.message);
  const actualEmail = JSON.parse(calls[0].body);
  assert.ok(
    actualEmail.html.includes(
      first.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n?|\n/g, "<br>"),
    ),
  );
  const countBefore = calls.length;
  await verifyContact({
    origin: "http://localhost",
    report() {},
    fetcher: (url, init) => mf.dispatchFetch(url, init),
  });
  assert.equal(
    calls.length,
    countBefore,
    "Read-only diagnostics must never send mail",
  );
  const adminHeaders = {
    Authorization:
      "Basic " +
      Buffer.from("ramtin:integration-private-password-0123456789").toString(
        "base64",
      ),
  };
  assert.equal(
    (await mf.dispatchFetch("http://localhost/en/studio/inquiries")).status,
    401,
  );
  assert.equal(
    (
      await mf.dispatchFetch("http://localhost/api/studio/inquiries", {
        headers: { "oai-authenticated-user-id": "fake-owner" },
      })
    ).status,
    401,
  );
  const privatePage = await mf.dispatchFetch(
    "http://localhost/en/studio/inquiries",
    { headers: adminHeaders },
  );
  assert.equal(privatePage.status, 200);
  assert.match(await privatePage.text(), /Your inquiries/);
  const detail = await mf.dispatchFetch(
    "http://localhost/api/studio/inquiries/" + saved.id,
    { headers: adminHeaders },
  );
  assert.equal(detail.status, 200);
  const privateData = (await detail.json()).inquiry;
  assert.equal(privateData.message, first.message);
  assert.equal(JSON.parse(privateData.details).description, first.message);
  assert.equal(privateData.notificationPayload, undefined);
  const patch = {
    updatedAt: saved.updatedAt,
    stage: "contacted",
    isRead: true,
    archived: false,
    privateNotes: "PRIVATE-SHOULD-NEVER-BE-EMAILED",
    meetingAt: null,
    meetingNotes: "Private meeting",
    followUpAt: null,
    nextAction: "Reply",
  };
  assert.equal(
    (
      await mf.dispatchFetch(
        "http://localhost/api/studio/inquiries/" + saved.id,
        {
          method: "PATCH",
          headers: {
            ...adminHeaders,
            Origin: "https://evil.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await mf.dispatchFetch(
        "http://localhost/api/studio/inquiries/" + saved.id,
        {
          method: "PATCH",
          headers: {
            ...adminHeaders,
            Origin: "http://localhost",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        },
      )
    ).status,
    200,
  );
  const list = await mf.dispatchFetch("http://localhost/api/studio/inquiries", {
    headers: adminHeaders,
  });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).total, 1);
  assert.equal(
    (
      await mf.dispatchFetch("http://localhost/api/internal/contact-outbox", {
        method: "POST",
      })
    ).status,
    401,
  );

  const repeated = await submit(first);
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).reference, accepted.reference);
  assert.equal(calls.length, 1);
  providerStatus = 403;
  const second = input();
  const failed = await submit(second);
  assert.equal(failed.status, 202);
  assert.equal((await failed.json()).emailStatus, "pending");
  const record = await db
    .prepare("SELECT * FROM inquiries WHERE idempotencyKey=?")
    .bind(second.idempotencyKey)
    .first();
  assert.equal(record.status, "failed");
  assert.equal(record.providerId, null);
  assert.ok(record.notificationPayload);
  // Only the disposable fixture database is changed to make the retry due.
  await db
    .prepare("UPDATE inquiries SET nextNotificationAt=0 WHERE id=?")
    .bind(record.id)
    .run();
  providerStatus = 200;
  const scheduled = await mf.dispatchFetch(
    "http://localhost/cdn-cgi/handler/scheduled?cron=*+*+*+*+*",
  );
  assert.equal(scheduled.status, 200, await scheduled.text());
  assert.equal(
    (
      await db
        .prepare("SELECT status FROM inquiries WHERE id=?")
        .bind(record.id)
        .first()
    ).status,
    "sent",
  );
  const retry = await submit(second);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).sent, true);
  assert.equal(calls[1].body, calls[2].body);
  assert.equal(calls[1].key, calls[2].key);
  const diagnostic = await sendTestInquiry({
    origin: "http://localhost",
    report() {},
    fetcher: (url, init) => mf.dispatchFetch(url, init),
  });
  assert.ok(diagnostic.providerId);
  assert.equal(calls.length, 4);
  const bad = await mf.dispatchFetch("http://localhost/api/contact", {
    method: "POST",
    headers: {
      Origin: "https://wrong.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input()),
  });
  assert.equal(bad.status, 403);
  const mediaId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const projectId = crypto.randomUUID();
  const translation = {
    title: "Fixture project",
    summary: "An existing published project is preserved.",
    body: "Project details",
    role: "Developer",
    challenge: "",
    solution: "",
    outcome: "",
    alt: "Project image",
  };
  const entry = {
    kind: "project",
    slug: "fixture-project",
    status: "published",
    category: "fullstack",
    projectType: "personal",
    year: 2026,
    featured: true,
    sortOrder: 0,
    technologies: ["React"],
    cover: "/api/media/" + mediaId,
    gallery: [],
    liveUrl: "",
    githubUrl: "",
    en: translation,
    fa: translation,
  };
  await db
    .prepare(
      "INSERT INTO entries(id,kind,slug,status,featured,sortOrder,data,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      projectId,
      "project",
      entry.slug,
      "published",
      1,
      0,
      JSON.stringify(entry),
      1,
      1,
    )
    .run();
  const bucket = await mf.getR2Bucket("BUCKET");
  await bucket.put(mediaId, "fixture", {
    httpMetadata: { contentType: "image/jpeg" },
  });
  assert.equal(
    (await mf.dispatchFetch("http://localhost/en/work/fixture-project")).status,
    200,
  );
  assert.equal(
    (await mf.dispatchFetch("http://localhost/api/media/" + mediaId)).status,
    200,
  );
  await db
    .prepare("UPDATE entries SET status='draft' WHERE id=?")
    .bind(projectId)
    .run();
  assert.equal(
    (
      await mf.dispatchFetch("http://localhost/api/media/" + mediaId, {
        headers: {
          "oai-authenticated-user-id": "fake-admin",
          "oai-authenticated-user-email": "fake@example.com",
        },
      })
    ).status,
    404,
  );
  console.log(
    "PASS: eight public pages, five form questions, RTL/fonts, protected inquiry dashboard and APIs, preserved published project/media, private draft media, synchronous Contact email acceptance, all five fields, fixed Gmail recipient, duplicates, rejection, automatic scheduled frozen retry and read-only diagnostic. Provider simulated; no real email.",
  );
} finally {
  await mf.dispose();
}
