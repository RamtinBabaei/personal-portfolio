import { parseEnv } from "node:util";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
export async function sendTestInquiry({
  origin = "http://127.0.0.1:5173",
  fetcher = globalThis.fetch,
  report = console.log,
} = {}) {
  const base = new URL(origin);
  if (
    base.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("Use the local dev origin, such as http://127.0.0.1:5173.");
  report(
    "Explicit test: creating one NEW inquiry and sending one test email. This does not process earlier submissions.",
  );
  const marker =
    "CONTACT-CHECK-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8);
  const input = {
    name: "Ramtin Contact Test",
    email: "ramtin.babaei2002@gmail.com",
    company: "Local email verification",
    services: ["fullstack", "backend"],
    budget: "undecided",
    subject: marker,
    message:
      "A controlled test of all five contact fields and email delivery. Marker: " +
      marker,
    website: "",
    idempotencyKey: crypto.randomUUID(),
    startedAt: Date.now() - 5000,
  };
  const response = await fetcher(new URL("/api/contact", base), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
    headers: { Origin: base.origin, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (
    response.status !== 200 ||
    result.accepted !== true ||
    result.sent !== true ||
    result.emailStatus !== "accepted" ||
    typeof result.reference !== "string" ||
    typeof result.providerId !== "string" ||
    !result.providerId.trim()
  )
    throw new Error(
      "Contact check did not confirm acceptance. HTTP " +
        response.status +
        "; code " +
        (typeof result.error === "string" ? result.error : "UNCONFIRMED") +
        ". Check the server log and email configuration. Do not repeatedly submit new tests.",
    );
  report("PASS: provider acceptance and persisted status confirmed.");
  report("Inquiry reference: " + result.reference);
  report("Provider email ID: " + result.providerId);
  report("Recipient: ramtin.babaei2002@gmail.com");
  report("Gmail/Spam search marker: " + marker);
  report(
    "Inbox delivery is not verified by this command. Inspect the matching email ID in Resend and your Gmail inbox/Spam.",
  );
  return { reference: result.reference, providerId: result.providerId, marker };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    let config;
    try {
      config = parseEnv(
        await readFile(new URL("../.dev.vars", import.meta.url), "utf8"),
      );
    } catch {
      throw new Error(
        "Create .dev.vars with pnpm setup:local first. No request was submitted.",
      );
    }
    if (!config.RESEND_API_KEY?.trim() || !config.CONTACT_FROM?.trim())
      throw new Error(
        "Set RESEND_API_KEY and CONTACT_FROM in .dev.vars and restart pnpm dev. No request was submitted.",
      );
    await sendTestInquiry({
      origin: process.argv[2] || "http://127.0.0.1:5173",
    });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Contact check failed.",
    );
    process.exitCode = 1;
  }
}
