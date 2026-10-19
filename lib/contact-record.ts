import { z } from "zod";
import type { Inquiry } from "./domain";
// Legacy workflow columns remain only to preserve existing database records.
export const inquiryDefaults = {
  details: "{}",
  notificationPayload: "",
  stage: "new",
  isRead: 0,
  archived: 0,
  privateNotes: "",
  meetingAt: null as number | null,
  meetingNotes: "",
  followUpAt: null as number | null,
  nextAction: "",
  updatedAt: 0,
  notificationAttempts: 0,
  firstNotificationAt: 0,
  nextNotificationAt: 0,
  notificationLeaseUntil: 0,
  notificationLease: "",
  lastNotificationError: null as string | null,
};
export type InquiryWorkflow = typeof inquiryDefaults;
export function inquiryDetails(row: Pick<Inquiry, "details" | "message">) {
  const schema = z.object({
    company: z.string(),
    services: z.array(z.string()),
    budget: z.string(),
    description: z.string(),
  });
  try {
    const parsed = schema.safeParse(JSON.parse(row.details));
    if (parsed.success)
      return {
        ...parsed.data,
        description: parsed.data.description.trim()
          ? parsed.data.description
          : row.message,
      };
  } catch {}
  return {
    company: "",
    services: [],
    budget: "undecided",
    description: row.message,
  };
}
