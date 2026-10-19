import { z } from "zod";
import type { Inquiry } from "./domain";
export const inquiryStages = [
  "new",
  "contacted",
  "meeting",
  "proposal",
  "active",
  "closed",
] as const;
export const stageLabels = {
  en: [
    "New",
    "Contacted",
    "Meeting scheduled",
    "Proposal pending",
    "Project started",
    "Closed",
  ],
  fa: [
    "جدید",
    "تماس گرفته‌شده",
    "جلسه تنظیم‌شده",
    "پیشنهاد در انتظار",
    "پروژه آغازشده",
    "بسته‌شده",
  ],
} as const;
export { inquiryDefaults, inquiryDetails } from "./contact-record";
const date = z.number().int().min(0).max(8640000000000000).nullable();
export const inquiryPatchSchema = z
  .object({
    updatedAt: z.number().int().nonnegative(),
    stage: z.enum(inquiryStages),
    isRead: z.boolean(),
    archived: z.boolean(),
    privateNotes: z.string().trim().max(10000),
    meetingAt: date,
    meetingNotes: z.string().trim().max(10000),
    followUpAt: date,
    nextAction: z.string().trim().max(500),
  })
  .strict();
export type InquiryPatch = z.infer<typeof inquiryPatchSchema>;
export const inquiryQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    stage: z.enum(["all", ...inquiryStages]).default("all"),
    archive: z.enum(["active", "archived", "all"]).default("active"),
    unread: z.enum(["all", "unread"]).default("all"),
    sort: z.enum(["newest", "oldest"]).default("newest"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
export type InquiryQuery = z.infer<typeof inquiryQuerySchema>;
export type InquiryCounts = Record<
  (typeof inquiryStages)[number] | "total",
  number
>;
export type InquiryView = Omit<
  Inquiry,
  | "fingerprint"
  | "idempotencyKey"
  | "notificationLease"
  | "notificationLeaseUntil"
  | "notificationPayload"
>;
export function inquiryView(row: Inquiry): InquiryView {
  const {
    fingerprint,
    idempotencyKey,
    notificationLease,
    notificationLeaseUntil,
    notificationPayload,
    ...view
  } = row;
  void fingerprint;
  void idempotencyKey;
  void notificationLease;
  void notificationLeaseUntil;
  void notificationPayload;
  return view;
}
export function emailReply(row: Pick<Inquiry, "email" | "subject" | "id">) {
  return (
    "mailto:" +
    encodeURIComponent(row.email) +
    "?subject=" +
    encodeURIComponent("Re: " + row.subject + " [" + row.id.slice(0, 8) + "]")
  );
}
