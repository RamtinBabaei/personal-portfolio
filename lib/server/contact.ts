import { contactSchema, type Inquiry } from "@/lib/domain";
import { orderedServices } from "@/lib/contact";
import { inquiryDefaults } from "@/lib/contact-record";
import { runtime, runtimeFetch } from "./runtime";
import { getStore } from "./store";
import { notifyInquiry, type NotificationDeps } from "./notifications";
import {
  assertOrigin,
  digest,
  errorResponse,
  HttpError,
  readJson,
} from "./http";

// A success response requires a real provider email ID and a persisted state.
// No administrator account or dashboard is involved in this flow.
export async function submitContact(request: Request, deps?: NotificationDeps) {
  try {
    assertOrigin(request);
    const parsed = contactSchema.safeParse(await readJson(request, 40000));
    if (!parsed.success)
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "Check the five form fields, selected services and message.",
      );
    const data = parsed.data;
    const now = deps?.now ?? Date.now();
    if (data.website)
      throw new HttpError(
        400,
        "SPAM_REJECTED",
        "Submission could not be accepted.",
      );
    if (now - data.startedAt < 1500 || now - data.startedAt > 86400000)
      throw new HttpError(
        400,
        "FORM_EXPIRED",
        "Please reopen the form and try again.",
      );
    const env = deps?.env ?? runtime();
    const store = deps?.store ?? (await getStore());
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const bucket = await digest(
      (env.RATE_LIMIT_SALT ?? "portfolio") + ":" + ip,
    );
    const requestedLimit = Number(env.CONTACT_RATE_LIMIT_PER_HOUR);
    const limit =
      Number.isInteger(requestedLimit) &&
      requestedLimit >= 1 &&
      requestedLimit <= 100
        ? requestedLimit
        : 5;
    if ((await store.consumeRate("contact:" + bucket, now, 3600000)) > limit)
      return Response.json(
        { error: "RATE_LIMITED", message: "Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "3600", "Cache-Control": "no-store" },
        },
      );
    const fingerprint = await digest(
      JSON.stringify({
        name: data.name,
        email: data.email.toLowerCase(),
        subject: data.subject,
        company: data.company,
        services: orderedServices(data.services),
        budget: data.budget,
        message: data.message,
      }),
    );
    let inquiry = await store.inquiry(data.idempotencyKey);
    if (inquiry && inquiry.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This submission key belongs to different content. Please reload the form.",
      );
    if (!inquiry) {
      const candidate: Inquiry = {
        ...inquiryDefaults,
        id: crypto.randomUUID(),
        idempotencyKey: data.idempotencyKey,
        fingerprint,
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: "queued",
        createdAt: now,
        updatedAt: now,
        providerId: null,
        details: JSON.stringify({
          company: data.company,
          services: orderedServices(data.services),
          budget: data.budget,
          description: data.message,
        }),
      };
      if (await store.createInquiry(candidate)) inquiry = candidate;
      else inquiry = await store.inquiry(data.idempotencyKey);
      if (!inquiry || inquiry.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This submission key is already in use.",
        );
    }
    let providerId: string;
    try {
      providerId = await notifyInquiry(inquiry.id, {
        store,
        env,
        fetcher: deps?.fetcher ?? runtimeFetch(),
        now,
      });
    } catch (error) {
      if (
        error instanceof HttpError &&
        ["EMAIL_SEND_FAILED", "EMAIL_UNCONFIGURED"].includes(error.code)
      )
        return Response.json(
          {
            stored: true,
            accepted: false,
            sent: false,
            emailStatus: "pending",
            automaticRetry: true,
            reference: inquiry.id,
          },
          { status: 202, headers: { "Cache-Control": "no-store" } },
        );
      throw error;
    }
    return Response.json(
      {
        accepted: true,
        sent: true,
        emailStatus: "accepted",
        reference: inquiry.id,
        providerId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
