// Run from a server scheduler. The secret is read only from server environment.
const base = new URL(process.env.SITE_URL || "http://127.0.0.1:5173");
if (
  base.username ||
  base.password ||
  (base.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
)
  throw new Error("Use HTTPS for the server scheduler.");
if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32)
  throw new Error("Configure CRON_SECRET in the server environment.");
const response = await fetch(new URL("/api/internal/contact-outbox", base), {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
  signal: AbortSignal.timeout(115000),
});
if (!response.ok)
  throw new Error("Outbox processing failed; HTTP " + response.status);
console.log(await response.json());
