// Read-only diagnostics. This command never creates an inquiry or dispatches mail.
import { pathToFileURL } from "node:url";
export async function verifyContact({
  origin = "http://127.0.0.1:5173",
  fetcher = fetch,
  report = console.log,
} = {}) {
  const url = new URL(origin);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Use your HTTPS site or local development origin.");
  const response = await fetcher(new URL("/api/contact", url), {
    method: "GET",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.automaticNotifications !== true)
    throw new Error(
      "Contact endpoint is unavailable. Check the running server.",
    );
  report(
    "Automatic sending: enabled on form submission. No dispatch command is required.",
  );
  report(
    "Email configuration: " +
      (body.emailConfigured
        ? "present (provider acceptance is not verified)"
        : "missing; saved inquiries await configuration"),
  );
  report("Read-only check complete. No inquiry created and no email sent.");
  return body;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await verifyContact({ origin: process.argv[2] || "http://127.0.0.1:5173" });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Contact check failed.",
    );
    process.exitCode = 1;
  }
}
