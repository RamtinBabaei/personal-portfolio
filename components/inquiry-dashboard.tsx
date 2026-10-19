"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/domain";
import {
  inquiryDetails,
  inquiryQuerySchema,
  inquiryStages,
  stageLabels,
  emailReply,
  type InquiryCounts,
  type InquiryPatch,
  type InquiryQuery,
  type InquiryView,
} from "@/lib/inquiries";
import { contactServices, serviceLabels } from "@/lib/contact";

type Data = { items: InquiryView[]; total: number; counts: InquiryCounts };
const editable = (r: InquiryView): InquiryPatch => ({
  updatedAt: r.updatedAt,
  stage: r.stage as InquiryPatch["stage"],
  isRead: !!r.isRead,
  archived: !!r.archived,
  privateNotes: r.privateNotes,
  meetingAt: r.meetingAt,
  meetingNotes: r.meetingNotes,
  followUpAt: r.followUpAt,
  nextAction: r.nextAction,
});
const localDate = (value: number | null) =>
  value === null
    ? ""
    : new Date(value - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
const parseDate = (value: string) => (value ? new Date(value).getTime() : null);
export function InquiryDashboard({
  locale,
  initial,
  notificationConfigured,
}: {
  locale: Locale;
  initial: Data;
  notificationConfigured: boolean;
}) {
  const en = locale === "en";
  const tr = (a: string, b: string) => (en ? a : b);
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState<InquiryQuery>(
    inquiryQuerySchema.parse({}),
  );
  const [selected, setSelected] = useState<InquiryView | null>(null);
  const [draft, setDraft] = useState<InquiryPatch | null>(null);
  const [configured, setConfigured] = useState(notificationConfigured);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const dirty =
    !!selected &&
    !!draft &&
    JSON.stringify(editable(selected)) !== JSON.stringify(draft);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const dateLabel = (value: number) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(value) + " UTC";
  function choose(row: InquiryView) {
    if (
      dirty &&
      !window.confirm(
        tr(
          "Discard unsaved inquiry changes?",
          "تغییرات ذخیره‌نشده کنار گذاشته شوند؟",
        ),
      )
    )
      return;
    setSelected(row);
    setDraft(editable(row));
    setFeedback("");
    requestAnimationFrame(() =>
      detailHeading.current?.focus({ preventScroll: true }),
    );
  }
  async function api<T>(path: string, method = "GET", body?: unknown) {
    controller.current?.abort();
    controller.current = new AbortController();
    const response = await fetch(path, {
      method,
      cache: "no-store",
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(20000),
      ]),
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 409)
        throw new Error(
          tr(
            "This inquiry changed elsewhere. Reload before saving; your edits remain here.",
            "این درخواست در جای دیگری تغییر کرده است. پیش از ذخیره، دوباره بارگیری کنید؛ ویرایش شما حفظ شده است.",
          ),
        );
      throw new Error(
        tr(
          "The request failed. Check your sign-in and try again.",
          "درخواست انجام نشد. ورود خود را بررسی و دوباره تلاش کنید.",
        ),
      );
    }
    return result as T;
  }
  async function load(next: InquiryQuery) {
    const result = await api<Data & { notificationConfigured: boolean }>(
      "/api/studio/inquiries?" +
        new URLSearchParams(
          Object.entries(next).map(([key, value]) => [key, String(value)]),
        ),
    );
    if (alive.current) {
      setData(result);
      setConfigured(result.notificationConfigured);
    }
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    setFailed(false);
    try {
      await task();
    } catch (error) {
      if (alive.current) {
        setFailed(true);
        setFeedback(
          error instanceof Error
            ? error.message
            : tr("Please try again.", "دوباره تلاش کنید."),
        );
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function field<K extends keyof InquiryPatch>(key: K, value: InquiryPatch[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  const details = selected ? inquiryDetails(selected) : null;
  return (
    <div className="inquiry-dashboard" aria-busy={busy}>
      <p className="inquiry-guide">
        {tr(
          "Review the request → contact the client → arrange a meeting → send a proposal → start the project.",
          "بررسی درخواست ← تماس با مشتری ← تنظیم جلسه ← ارسال پیشنهاد ← آغاز پروژه",
        )}
      </p>
      <div
        className="inquiry-stats"
        aria-label={tr("Inquiry overview", "نمای کلی درخواست‌ها")}
      >
        {(["total", ...inquiryStages] as const).map((key, index) => (
          <div key={key}>
            <span>
              {index
                ? stageLabels[locale][index - 1]
                : tr("All inquiries", "همه درخواست‌ها")}
            </span>
            <strong>{data.counts[key]}</strong>
          </div>
        ))}
      </div>
      <div className="inquiry-notification-bar">
        <p>
          {configured
            ? tr(
                "Email notifications are configured. Pending requests remain saved until processed.",
                "اعلان ایمیل تنظیم شده است. درخواست‌های در انتظار تا زمان پردازش محفوظ‌اند.",
              )
            : tr(
                "Inquiries are saved. Add a Resend key and verified sender to enable email notifications.",
                "درخواست‌ها ذخیره می‌شوند. برای فعال‌سازی اعلان ایمیل، کلید Resend و فرستنده تأییدشده را تنظیم کنید.",
              )}
        </p>
        <button
          className="inquiry-action"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await api<{ configured: boolean }>(
                "/api/studio/inquiries/retry",
                "POST",
                {},
              );
              if (!alive.current) return;
              setConfigured(result.configured);
              await load(query);
              setFeedback(
                result.configured
                  ? tr(
                      "Due notifications processed. Open a request to review its delivery status.",
                      "اعلان‌های آماده پردازش شدند. برای بررسی وضعیت، درخواست را باز کنید.",
                    )
                  : tr(
                      "Email settings are missing. Your inquiries remain safely stored.",
                      "تنظیمات ایمیل کامل نیست. درخواست‌ها محفوظ‌اند.",
                    ),
              );
            })
          }
        >
          {tr("Process due notifications", "پردازش اعلان‌های آماده")}
        </button>
      </div>
      <form
        className="inquiry-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const next = { ...query, page: 1 };
          setQuery(next);
          void run(() => load(next));
        }}
      >
        <label>
          {tr("Search", "جست‌وجو")}
          <input
            type="search"
            maxLength={100}
            value={query.q}
            onChange={(e) => setQuery({ ...query, q: e.target.value })}
            placeholder={tr(
              "Name, email, organization…",
              "نام، ایمیل، سازمان…",
            )}
          />
        </label>
        <label>
          {tr("Stage", "مرحله")}
          <select
            value={query.stage}
            onChange={(e) =>
              setQuery({
                ...query,
                stage: e.target.value as InquiryQuery["stage"],
              })
            }
          >
            <option value="all">{tr("All stages", "همه مراحل")}</option>
            {inquiryStages.map((key, i) => (
              <option key={key} value={key}>
                {stageLabels[locale][i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Archive", "بایگانی")}
          <select
            value={query.archive}
            onChange={(e) =>
              setQuery({
                ...query,
                archive: e.target.value as InquiryQuery["archive"],
              })
            }
          >
            <option value="active">{tr("Inbox", "صندوق ورودی")}</option>
            <option value="archived">{tr("Archived", "بایگانی‌شده")}</option>
            <option value="all">{tr("All", "همه")}</option>
          </select>
        </label>
        <label>
          {tr("Read state", "وضعیت خواندن")}
          <select
            value={query.unread}
            onChange={(e) =>
              setQuery({
                ...query,
                unread: e.target.value as InquiryQuery["unread"],
              })
            }
          >
            <option value="all">{tr("All", "همه")}</option>
            <option value="unread">{tr("Unread", "خوانده‌نشده")}</option>
          </select>
        </label>
        <label>
          {tr("Order", "ترتیب")}
          <select
            value={query.sort}
            onChange={(e) =>
              setQuery({
                ...query,
                sort: e.target.value as InquiryQuery["sort"],
              })
            }
          >
            <option value="newest">{tr("Newest", "جدیدترین")}</option>
            <option value="oldest">{tr("Oldest", "قدیمی‌ترین")}</option>
          </select>
        </label>
        <button className="inquiry-action" disabled={busy}>
          {tr("Apply / refresh", "اعمال / تازه‌سازی")}
        </button>
      </form>
      <p
        className={
          "inquiry-feedback " + (failed ? "inquiry-feedback--error" : "")
        }
        role={failed ? "alert" : "status"}
      >
        {feedback}
      </p>
      <div className="inquiry-workspace">
        <section
          className="inquiry-list"
          aria-label={tr("Client inquiries", "درخواست‌های مشتریان")}
        >
          <p className="eyebrow">
            {data.total} {tr("matching inquiries", "درخواست مطابق")}
          </p>
          {data.items.map((row) => (
            <button
              type="button"
              key={row.id}
              disabled={busy}
              aria-pressed={selected?.id === row.id}
              onClick={() => choose(row)}
            >
              <span className="inquiry-list-title">
                <strong>{row.name}</strong>
                {!row.isRead && <span>{tr("Unread", "جدید")}</span>}
              </span>
              <span>{row.subject}</span>
              <small>{dateLabel(row.createdAt)}</small>
              <span className="inquiry-stage">
                {stageLabels[locale][
                  inquiryStages.indexOf(
                    row.stage as (typeof inquiryStages)[number],
                  )
                ] ?? row.stage}
              </span>
            </button>
          ))}
          {!data.items.length && (
            <p className="studio-empty">
              {tr(
                "No inquiries match these filters.",
                "درخواستی با این فیلترها وجود ندارد.",
              )}
            </p>
          )}
          <div className="inquiry-pagination">
            <button
              className="inquiry-action"
              type="button"
              disabled={busy || query.page === 1}
              onClick={() => {
                const next = { ...query, page: query.page - 1 };
                setQuery(next);
                void run(() => load(next));
              }}
            >
              {tr("Previous", "قبلی")}
            </button>
            <span>
              {query.page} / {Math.max(1, Math.ceil(data.total / 30))}
            </span>
            <button
              className="inquiry-action"
              type="button"
              disabled={busy || query.page * 30 >= data.total}
              onClick={() => {
                const next = { ...query, page: query.page + 1 };
                setQuery(next);
                void run(() => load(next));
              }}
            >
              {tr("Next", "بعدی")}
            </button>
          </div>
        </section>
        {selected && draft && details ? (
          <section
            className="inquiry-detail"
            aria-labelledby="inquiry-detail-title"
          >
            <div className="inquiry-detail-heading">
              <h2 ref={detailHeading} tabIndex={-1} id="inquiry-detail-title">
                {selected.name}
              </h2>
              <a className="inquiry-action" href={emailReply(selected)}>
                {tr("Reply by email ↗", "پاسخ با ایمیل ↗")}
              </a>
            </div>
            <a dir="ltr" href={"mailto:" + encodeURIComponent(selected.email)}>
              {selected.email}
            </a>
            <dl className="inquiry-facts">
              <div>
                <dt>{tr("Inquiry Reference ID", "شناسه")}</dt>
                <dd dir="ltr">{selected.id}</dd>
              </div>
              <div>
                <dt>{tr("Received", "دریافت")}</dt>
                <dd>{dateLabel(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>{tr("Organization", "سازمان")}</dt>
                <dd>{details.company || tr("Not provided", "وارد نشده")}</dd>
              </div>
              <div>
                <dt>{tr("Services", "خدمات")}</dt>
                <dd>
                  {details.services
                    .map(
                      (id) =>
                        serviceLabels[locale][
                          contactServices.indexOf(
                            id as (typeof contactServices)[number],
                          )
                        ] ?? id,
                    )
                    .join(" · ") || tr("See message", "متن پیام را ببینید")}
                </dd>
              </div>
              <div>
                <dt>{tr("Notification", "اعلان")}</dt>
                <dd>
                  {selected.status === "sent"
                    ? tr(
                        "Accepted by email provider; inbox delivery unverified",
                        "پذیرفته‌شده توسط سرویس ایمیل؛ دریافت در صندوق تأیید نشده",
                      )
                    : selected.status}{" "}
                  · {selected.notificationAttempts} {tr("attempts", "تلاش")}
                  {selected.lastNotificationError &&
                    " · " + selected.lastNotificationError}
                </dd>
              </div>
              {selected.providerId && (
                <div>
                  <dt>{tr("Email Provider ID", "شناسه سرویس ایمیل")}</dt>
                  <dd dir="ltr">{selected.providerId}</dd>
                </div>
              )}
            </dl>
            <h3>{tr("Project Description / Client Message", "شرح پروژه")}</h3>
            <p className="inquiry-description" dir="auto">
              {details.description}
            </p>
            {selected.lastNotificationError === "REVIEW_REQUIRED" && (
              <p>
                {tr(
                  "Check the email provider before resending; the deduplication window has expired.",
                  "پیش از ارسال دوباره، سرویس ایمیل را بررسی کنید؛ بازه جلوگیری از ارسال تکراری گذشته است.",
                )}
              </p>
            )}
            <form
              className="inquiry-edit"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const result = await api<{ inquiry: InquiryView }>(
                    "/api/studio/inquiries/" + selected.id,
                    "PATCH",
                    draft,
                  );
                  if (!alive.current) return;
                  setSelected(result.inquiry);
                  setDraft(editable(result.inquiry));
                  await load(query);
                  setFeedback(
                    tr("Inquiry updated.", "درخواست به‌روزرسانی شد."),
                  );
                });
              }}
            >
              <label>
                {tr("Workflow stage", "مرحله همکاری")}
                <select
                  value={draft.stage}
                  disabled={busy}
                  onChange={(e) =>
                    field("stage", e.target.value as InquiryPatch["stage"])
                  }
                >
                  {inquiryStages.map((key, i) => (
                    <option key={key} value={key}>
                      {stageLabels[locale][i]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inquiry-flags">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.isRead}
                    disabled={busy}
                    onChange={(e) => field("isRead", e.target.checked)}
                  />
                  {tr("Read", "خوانده‌شده")}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.archived}
                    disabled={busy}
                    onChange={(e) => field("archived", e.target.checked)}
                  />
                  {tr("Archived", "بایگانی‌شده")}
                </label>
              </div>
              <label>
                {tr("Private communication notes", "یادداشت خصوصی ارتباطات")}
                <textarea
                  maxLength={10000}
                  rows={4}
                  value={draft.privateNotes}
                  disabled={busy}
                  onChange={(e) => field("privateNotes", e.target.value)}
                />
              </label>
              <label>
                {tr(
                  "Meeting — your device time",
                  "زمان جلسه — زمان دستگاه شما",
                )}
                <input
                  type="datetime-local"
                  value={localDate(draft.meetingAt)}
                  disabled={busy}
                  onChange={(e) =>
                    field("meetingAt", parseDate(e.target.value))
                  }
                />
              </label>
              <label>
                {tr("Meeting details / notes", "جزئیات و یادداشت جلسه")}
                <textarea
                  maxLength={10000}
                  rows={3}
                  value={draft.meetingNotes}
                  disabled={busy}
                  onChange={(e) => field("meetingNotes", e.target.value)}
                />
              </label>
              <label>
                {tr(
                  "Next follow-up — your device time",
                  "پیگیری بعدی — زمان دستگاه شما",
                )}
                <input
                  type="datetime-local"
                  value={localDate(draft.followUpAt)}
                  disabled={busy}
                  onChange={(e) =>
                    field("followUpAt", parseDate(e.target.value))
                  }
                />
              </label>
              <label>
                {tr("Next action", "اقدام بعدی")}
                <input
                  maxLength={500}
                  value={draft.nextAction}
                  disabled={busy}
                  onChange={(e) => field("nextAction", e.target.value)}
                />
              </label>
              <div className="inquiry-edit-actions">
                <button
                  className="inquiry-action inquiry-action--primary"
                  disabled={busy || !dirty}
                >
                  {busy
                    ? tr("Saving…", "در حال ذخیره…")
                    : tr("Save changes", "ذخیره تغییرات")}
                </button>
                <button
                  type="button"
                  className="inquiry-action"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (
                        dirty &&
                        !window.confirm(
                          tr(
                            "Discard your edits and reload?",
                            "ویرایش‌ها کنار گذاشته و دوباره بارگیری شود؟",
                          ),
                        )
                      )
                        return;
                      const result = await api<{ inquiry: InquiryView }>(
                        "/api/studio/inquiries/" + selected.id,
                      );
                      if (alive.current) {
                        setSelected(result.inquiry);
                        setDraft(editable(result.inquiry));
                      }
                    })
                  }
                >
                  {tr("Reload inquiry", "بارگیری دوباره درخواست")}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="inquiry-detail inquiry-detail--empty">
            <h2>{tr("One conversation at a time.", "هر بار، یک گفت‌وگو.")}</h2>
            <p>
              {tr(
                "Select an inquiry to review its details and plan the next step.",
                "برای بررسی جزئیات و برنامه‌ریزی قدم بعد، یک درخواست انتخاب کنید.",
              )}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
