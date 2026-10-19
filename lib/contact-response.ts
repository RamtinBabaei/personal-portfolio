export type ContactOutcome =
  | "queued"
  | "sent"
  | "pending"
  | "unavailable"
  | "rate"
  | "validation"
  | "review"
  | "failure";
export function contactOutcome(
  status: number,
  result: unknown,
): ContactOutcome {
  if (!result || typeof result !== "object") return "failure";
  const body = result as Record<string, unknown>;
  if (
    status === 200 &&
    body.accepted === true &&
    body.sent === true &&
    body.emailStatus === "accepted" &&
    typeof body.reference === "string" &&
    /^[0-9a-f-]{36}$/i.test(body.reference) &&
    typeof body.providerId === "string" &&
    body.providerId.trim()
  )
    return "sent";
  if (
    status === 202 &&
    body.stored === true &&
    body.accepted === false &&
    body.sent === false &&
    body.emailStatus === "pending" &&
    body.automaticRetry === true &&
    typeof body.reference === "string" &&
    /^[0-9a-f-]{36}$/i.test(body.reference)
  )
    return "queued";
  if (
    body.error === "RETRY_NOT_READY" ||
    body.error === "ACCEPTED_STORAGE_UNCERTAIN"
  )
    return "pending";
  if (body.error === "REVIEW_REQUIRED") return "review";
  if (status === 503) return "unavailable";
  if (status === 429) return "rate";
  if (status === 422 || body.error === "FORM_EXPIRED") return "validation";
  return "failure";
}
