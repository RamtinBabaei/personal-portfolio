import type { Inquiry } from "@/lib/domain";
import { inquiryDetails } from "@/lib/contact-record";
import {
  serviceLabels,
  contactServices,
  budgetLabels,
  contactBudgets,
} from "@/lib/contact";
import type { Store } from "./store";
import type { RuntimeEnv } from "./runtime";
import { z } from "zod";
import { HttpError } from "./http";
import { CONTACT_RECIPIENT } from "@/lib/contact";

export type NotificationDeps = {
  store: Store;
  env: RuntimeEnv;
  fetcher: typeof fetch;
  now: number;
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function notificationEmail(row: Inquiry, env: RuntimeEnv) {
  const details = inquiryDetails(row);
  const services =
    details.services
      .map(
        (id) =>
          serviceLabels.en[
            contactServices.indexOf(id as (typeof contactServices)[number])
          ] ?? id,
      )
      .join(", ") || "See project description";
  const fields = [
    ["Client", row.name],
    ["Email", row.email],
    ["Organization", details.company || "Not provided"],
    ["Services", services],
    ["Submitted (UTC)", new Date(row.createdAt).toISOString()],
    ["Inquiry Reference ID", row.id],
  ];
  if (details.budget !== "undecided")
    fields.push([
      "Budget (USD)",
      budgetLabels.en[
        contactBudgets.indexOf(
          details.budget as (typeof contactBudgets)[number],
        )
      ] ?? details.budget,
    ]);
  const message = details.description.trim()
    ? details.description
    : row.message;
  const text =
    "Project Description / Client Message:\n" +
    message +
    "\n\n" +
    fields.map(([key, value]) => key + ": " + value).join("\n");
  const messageHtml = escapeHtml(message).replace(/\r\n?|\n/g, "<br>");
  const html =
    '<!doctype html><html lang="en"><body style="margin:0;background:#eef0f4;font-family:Arial,sans-serif;color:#20232a"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:640px;margin:0 auto;background:#fff;border-collapse:collapse"><tr><td style="padding:28px;color:#20232a"><p style="color:#3652df;font-size:12px">RAMTIN BABAEI / NEW INQUIRY</p><h1 style="font-size:28px;font-weight:400">A new conversation.</h1><p style="font-size:12px;color:#606975">Inquiry Reference ID: ' +
    escapeHtml(row.id) +
    '</p><h2 style="font-size:18px">Project Description / Client Message</h2><p dir="auto" style="font-size:16px;line-height:1.8;color:#20232a;overflow-wrap:anywhere;word-break:break-word">' +
    messageHtml +
    '</p><table style="width:100%;border-collapse:collapse">' +
    fields
      .map(
        ([key, value]) =>
          '<tr><th scope="row" style="text-align:left;vertical-align:top;padding:12px 12px 12px 0;border-bottom:1px solid #ddd;font-size:13px">' +
          escapeHtml(key) +
          '</th><td style="padding:12px 0;border-bottom:1px solid #ddd;font-size:14px;overflow-wrap:anywhere">' +
          escapeHtml(value) +
          "</td></tr>",
      )
      .join("") +
    '</table><p style="font-size:12px;color:#606975;margin-top:28px">Reply to this email to contact the client. Keep this inquiry private.</p></td></tr></table></td></tr></table></body></html>';

  return {
    from: env.CONTACT_FROM,
    to: [CONTACT_RECIPIENT],
    reply_to: row.email,
    subject: "Portfolio inquiry [" + row.id + "]: " + row.subject,
    text,
    html,
  };
}
export function assertEmailConfiguration(env: RuntimeEnv) {
  const from = env.CONTACT_FROM?.trim() || "";
  const address = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (
    !env.RESEND_API_KEY?.trim() ||
    !from ||
    /[\r\n]/.test(from) ||
    !z.string().email().safeParse(address).success
  )
    throw new HttpError(
      503,
      "EMAIL_UNCONFIGURED",
      "Email is temporarily unavailable. Please use the contact email alongside the form.",
    );
  if (/@(gmail|googlemail|yahoo|outlook|hotmail)\./i.test(address))
    throw new HttpError(
      503,
      "EMAIL_UNCONFIGURED",
      "A verified sending domain must be configured on the server.",
    );
}
export async function notifyInquiry(id: string, deps: NotificationDeps) {
  const { store, env, fetcher, now } = deps;
  const original = await store.findInquiry(id);
  if (!original) throw new HttpError(404, "NOT_FOUND", "Request not found.");
  if (original.status === "sent" && original.providerId)
    return original.providerId;
  if (
    original.lastNotificationError === "REVIEW_REQUIRED" ||
    original.lastNotificationError === "RETRY_EXHAUSTED" ||
    original.notificationAttempts >= 6 ||
    (original.firstNotificationAt &&
      now - original.firstNotificationAt >= 23 * 3600000) ||
    (original.notificationAttempts > 0 && !original.notificationPayload)
  ) {
    await store.holdNotification(id, now);
    throw new HttpError(
      409,
      "REVIEW_REQUIRED",
      "Email acceptance is uncertain. Please contact Ramtin directly rather than creating a duplicate request.",
    );
  }
  if (
    original.notificationLeaseUntil > now ||
    original.nextNotificationAt > now
  )
    throw new HttpError(
      409,
      "RETRY_NOT_READY",
      "This request is processing or waiting to retry. Please wait one minute before trying again.",
    );
  let payload: string;
  if (original.notificationPayload) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(original.notificationPayload);
    } catch {}
    const parsed = z
      .object({
        from: z.string(),
        to: z.tuple([z.literal(CONTACT_RECIPIENT)]),
        reply_to: z.string().email(),
        subject: z.string().min(1),
        text: z.string().min(1),
        html: z.string().optional(),
      })
      .safeParse(candidate);
    if (!parsed.success || parsed.data.reply_to !== original.email) {
      await store.holdNotification(id, now);
      throw new HttpError(
        409,
        "REVIEW_REQUIRED",
        "The saved email needs review. Please use the direct contact email.",
      );
    }
    const saved = parsed.data;
    assertEmailConfiguration({ ...env, CONTACT_FROM: saved.from });
    payload = original.notificationPayload;
  } else {
    assertEmailConfiguration(env);
    if (!z.string().email().safeParse(original.email).success)
      throw new HttpError(
        422,
        "INVALID_EMAIL",
        "The saved email address is invalid.",
      );
    payload = JSON.stringify(
      notificationEmail(original, {
        ...env,
        CONTACT_FROM: env.CONTACT_FROM!.trim(),
      }),
    );
  }
  const lease = crypto.randomUUID();
  const row = await store.claimNotification(id, now, lease, payload);
  if (!row)
    throw new HttpError(
      409,
      "RETRY_NOT_READY",
      "This request is already processing. Please try again shortly.",
    );
  let providerId: string | null = null;
  let code = "NETWORK_ERROR";
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: "Bearer " + env.RESEND_API_KEY!.trim(),
        "Content-Type": "application/json",
        "Idempotency-Key": "inquiry-" + row.idempotencyKey,
      },
      body: row.notificationPayload,
    });
    if (!response.ok) {
      code =
        (response.headers.has("X-Portfolio-Transport-Error")
          ? "LOCAL_TRANSPORT_HTTP_"
          : "PROVIDER_HTTP_") + response.status;
      await response.body?.cancel();
      throw new Error("EmailRejected");
    }
    code = "PROVIDER_RESPONSE_INVALID";
    const result = (await response.json()) as { id?: unknown };
    if (typeof result.id !== "string" || !result.id.trim())
      throw new Error("InvalidProviderResponse");
    providerId = result.id;
    if (
      !(await store.finishNotification(id, lease, "sent", providerId, null, 0))
    )
      throw new Error("AcceptanceNotSaved");
    return providerId;
  } catch {
    if (providerId) {
      console.error("Contact email status uncertain", {
        reference: id,
        providerId,
        code: "ACCEPTED_STORAGE_UNCERTAIN",
      });
      throw new HttpError(
        503,
        "ACCEPTED_STORAGE_UNCERTAIN",
        "The email service accepted the message, but its saved status could not be confirmed. Please wait before retrying the same form.",
      );
    }
    await store.finishNotification(
      id,
      lease,
      "failed",
      null,
      row.notificationAttempts >= 6 ? "RETRY_EXHAUSTED" : code,
      now + Math.min(3600000, 60000 * 2 ** (row.notificationAttempts - 1)),
    );
    console.error("Contact delivery failed", { reference: id, code });
    throw new HttpError(
      502,
      "EMAIL_SEND_FAILED",
      "Email acceptance was not confirmed. Your form is preserved. Please try again in one minute or use the direct contact email.",
    );
  }
}

// Scheduled processing uses the same frozen payload, lease and provider key as
// the immediate form POST. It never creates a new inquiry or test message.
export async function drainNotifications(deps: NotificationDeps, limit = 10) {
  const rows = await deps.store.dueNotifications(
    deps.now,
    Math.max(1, Math.min(10, limit)),
  );
  const result = {
    configured: !!deps.env.RESEND_API_KEY && !!deps.env.CONTACT_FROM,
    checked: 0,
    accepted: 0,
    pending: 0,
    review: 0,
  };
  const started = performance.now();
  for (const row of rows) {
    result.checked++;
    try {
      await notifyInquiry(row.id, {
        ...deps,
        now: deps.now + Math.floor(performance.now() - started),
      });
      result.accepted++;
    } catch (error) {
      if (error instanceof HttpError && error.code === "REVIEW_REQUIRED")
        result.review++;
      else result.pending++;
    }
  }
  if (result.checked) console.info("Contact outbox processed", result);
  return result;
}
