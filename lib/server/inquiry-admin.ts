import { z } from "zod";
import {
  inquiryPatchSchema,
  inquiryQuerySchema,
  inquiryView,
} from "@/lib/inquiries";
import { requireAdmin } from "./auth";
import { getStore } from "./store";
import { runtimeFetch, runtime } from "./runtime";
import { drainNotifications, notifyInquiry } from "./notifications";
import { assertOrigin, errorResponse, HttpError, readJson } from "./http";
const validId = (id: string) => {
  if (!z.string().uuid().safeParse(id).success)
    throw new HttpError(400, "INVALID_ID", "Invalid inquiry reference.");
};
async function access(mutation = false) {
  const user = await requireAdmin();
  const store = await getStore();
  const count = await store.consumeRate(
    "inquiry-admin:" + user.userId + ":" + (mutation ? "write" : "read"),
    Date.now(),
    60000,
  );
  if (count > (mutation ? 30 : 120))
    throw new HttpError(
      429,
      "RATE_LIMITED",
      "Please wait before trying again.",
    );
  return store;
}
export async function listInquiries(request: Request) {
  try {
    const store = await access();
    const parsed = inquiryQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "Check the inquiry filters.",
      );
    const data = await store.queryInquiries(parsed.data);
    return Response.json(
      {
        ...data,
        items: data.items.map(inquiryView),
        notificationConfigured:
          !!runtime().RESEND_API_KEY && !!runtime().CONTACT_FROM,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function getInquiry(id: string) {
  try {
    const store = await access();
    validId(id);
    const row = await store.findInquiry(id);
    if (!row) throw new HttpError(404, "NOT_FOUND", "Inquiry not found.");
    return Response.json(
      { inquiry: inquiryView(row) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function editInquiry(request: Request, id: string) {
  try {
    await requireAdmin();
    assertOrigin(request);
    validId(id);
    const parsed = inquiryPatchSchema.safeParse(await readJson(request, 80000));
    if (!parsed.success)
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "Check the inquiry status and private notes.",
      );
    const store = await access(true);
    if (!(await store.findInquiry(id)))
      throw new HttpError(404, "NOT_FOUND", "Inquiry not found.");
    const row = await store.updateInquiry(id, parsed.data, Date.now());
    if (!row)
      throw new HttpError(
        409,
        "EDIT_CONFLICT",
        "This inquiry changed in another session. Reload it before saving.",
      );
    return Response.json(
      { inquiry: inquiryView(row) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function retryNotifications(request: Request) {
  try {
    await requireAdmin();
    assertOrigin(request);
    const parsed = z
      .object({ id: z.string().uuid().optional() })
      .strict()
      .safeParse(await readJson(request, 1000));
    if (!parsed.success)
      throw new HttpError(422, "VALIDATION_ERROR", "Invalid retry request.");
    const store = await access(true);
    const deps = {
      store,
      env: runtime(),
      fetcher: runtimeFetch(),
      now: Date.now(),
    };
    if (
      (await store.consumeRate("inquiry-notification-retry", deps.now, 60000)) >
      5
    )
      throw new HttpError(
        429,
        "RATE_LIMITED",
        "Please wait before retrying notifications.",
      );
    let result;
    if (parsed.data.id) {
      if (!(await store.findInquiry(parsed.data.id)))
        throw new HttpError(404, "NOT_FOUND", "Inquiry not found.");
      result = {
        configured: !!deps.env.RESEND_API_KEY && !!deps.env.CONTACT_FROM,
        outcome: await notifyInquiry(parsed.data.id, deps),
      };
    } else result = await drainNotifications(deps, 5);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
