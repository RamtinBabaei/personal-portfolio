"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Locale } from "@/lib/domain";
import { profile, t } from "@/lib/copy";
import {
  contactFieldsSchema,
  contactServices,
  inquirySubject,
  orderedServices,
  serviceLabels,
} from "@/lib/contact";
import { Arrow } from "./ui-elements";
import { MagneticButton } from "./magnetic-button";
import { contactOutcome } from "@/lib/contact-response";

type Fields = z.infer<typeof contactFieldsSchema>;
export function ContactForm({ locale }: { locale: Locale }) {
  const text = t(locale);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(contactFieldsSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      services: [],
      budget: "undecided",
      message: "",
      website: "",
    },
  });
  const [status, setStatus] = useState<{
    ok: boolean;
    text: string;
    reference?: string;
    waiting?: boolean;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const requestController = useRef<AbortController | null>(null);
  const attempt = useRef<{
    key: string;
    content: string;
    startedAt: number;
  } | null>(null);
  const opened = useRef(0);
  const pending = sending || isSubmitting;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestController.current?.abort();
    };
  }, []);
  function start() {
    if (!opened.current) opened.current = Date.now();
  }
  const submit = useCallback(
    async (fields: Fields) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSending(true);
      setStatus(null);
      const values = {
        ...fields,
        services: orderedServices(fields.services),
        subject: inquirySubject(fields.services),
      };
      const content = JSON.stringify(values);
      if (!attempt.current || attempt.current.content !== content)
        attempt.current = {
          key: crypto.randomUUID(),
          content,
          startedAt: opened.current || Date.now() - 2000,
        };
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(25000),
          ]),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            idempotencyKey: attempt.current.key,
            startedAt:
              Date.now() - attempt.current.startedAt < 86400000
                ? attempt.current.startedAt
                : Date.now() - 2000,
          }),
        });
        const result: unknown = await response.json();
        if (!mounted.current) return;
        const outcome = contactOutcome(response.status, result);
        if (outcome === "sent") {
          setStatus({
            ok: true,
            text: text.success,
            reference: (result as { reference: string }).reference,
          });
          reset();
          attempt.current = null;
          opened.current = Date.now();
        } else {
          setStatus({
            ok: false,
            waiting: outcome === "queued" || outcome === "pending",
            reference:
              outcome === "queued"
                ? (result as { reference: string }).reference
                : undefined,
            text:
              outcome === "queued"
                ? text.contactQueued
                : outcome === "pending"
                  ? text.contactPending
                  : outcome === "review"
                    ? text.contactReview
                    : outcome === "unavailable"
                      ? text.unavailable
                      : outcome === "rate"
                        ? text.rate
                        : outcome === "validation"
                          ? text.validation
                          : text.failure,
          });
        }
      } catch {
        if (mounted.current && !controller.signal.aborted)
          setStatus({ ok: false, text: text.failure });
      } finally {
        inFlight.current = false;
        requestController.current = null;
        if (mounted.current) setSending(false);
      }
    },
    [reset, text],
  );
  const question = (index: string, label: string, optional = false) => (
    <span className="contact-question">
      <span className="contact-field-index" aria-hidden="true">
        {index}
      </span>
      <span>
        {label}
        {optional && <small> ({text.optional})</small>}
      </span>
    </span>
  );
  const fields = [
    {
      key: "name" as const,
      label: text.formName,
      placeholder: text.namePlaceholder,
      type: "text",
      autoComplete: "name",
      maxLength: 100,
    },
    {
      key: "email" as const,
      label: text.formEmail,
      placeholder: "name@example.com",
      type: "email",
      autoComplete: "email",
      maxLength: 254,
    },
    {
      key: "company" as const,
      label: text.formCompany,
      placeholder: text.companyHint,
      type: "text",
      autoComplete: "organization",
      maxLength: 160,
    },
  ];
  return (
    <form
      className="contact-form"
      aria-label={locale === "en" ? "Project inquiry" : "درخواست پروژه"}
      aria-busy={pending}
      onFocus={start}
      noValidate
      onSubmit={(event) => {
        if (inFlight.current) event.preventDefault();
        else void handleSubmit(submit)(event);
      }}
    >
      <p className="contact-form-intro">{text.requiredHint}</p>
      {fields.map((field, index) => {
        const error = errors[field.key];
        return (
          <div className="contact-field" data-form-reveal key={field.key}>
            <label htmlFor={"contact-" + field.key}>
              {question(
                "0" + (index + 1),
                field.label,
                field.key === "company",
              )}
            </label>
            <input
              id={"contact-" + field.key}
              className="contact-input"
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              dir={field.key === "email" ? "ltr" : undefined}
              required={field.key !== "company"}
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? field.key + "-error" : undefined}
              {...register(field.key)}
            />
            <p className="contact-field-error" id={field.key + "-error"}>
              {error &&
                (field.key === "email"
                  ? locale === "en"
                    ? "Enter a valid email address."
                    : "یک ایمیل معتبر وارد کنید."
                  : field.key === "company"
                    ? text.companyError
                    : text.nameHint)}
            </p>
          </div>
        );
      })}
      <div className="contact-field" data-form-reveal>
        <fieldset
          aria-describedby={
            "services-hint" + (errors.services ? " services-error" : "")
          }
        >
          <legend>{question("04", text.formServices)}</legend>
          <p className="contact-field-hint" id="services-hint">
            {text.serviceHint}
          </p>
          <div className="contact-choices">
            {contactServices.map((value, index) => (
              <label className="contact-choice" key={value}>
                <input
                  type="checkbox"
                  value={value}
                  disabled={pending}
                  aria-invalid={!!errors.services}
                  {...register("services")}
                />
                <span>
                  <span className="choice-mark" aria-hidden="true">
                    ✓
                  </span>
                  {serviceLabels[locale][index]}
                </span>
              </label>
            ))}
          </div>
          <p id="services-error" className="contact-field-error">
            {errors.services && text.serviceError}
          </p>
        </fieldset>
      </div>
      <div className="contact-field" data-form-reveal>
        <label htmlFor="contact-message">
          {question("05", text.formMessage)}
        </label>
        <textarea
          id="contact-message"
          className="contact-input"
          rows={5}
          maxLength={5000}
          required
          disabled={pending}
          placeholder={text.messagePlaceholder}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          {...register("message")}
        />
        <p className="contact-field-error" id="message-error">
          {errors.message && text.messageHint}
        </p>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>
      <div className="contact-submit-row">
        <p className="contact-privacy">{text.privacy}</p>
        <MagneticButton
          type="submit"
          className="contact-submit"
          disabled={pending}
          busy={pending}
        >
          {pending ? (
            <>
              <span className="contact-spinner" aria-hidden="true" />
              {text.sending}
            </>
          ) : (
            <>
              {text.send}
              <Arrow diagonal />
            </>
          )}
        </MagneticButton>
      </div>
      <div className="contact-feedback">
        {pending && <p role="status">{text.sending}</p>}
        {status && (
          <p
            className={
              status.ok
                ? "contact-success"
                : status.waiting
                  ? "contact-failure contact-pending"
                  : "contact-failure"
            }
            role={status.ok || status.waiting ? "status" : "alert"}
          >
            {status.text}
            {status.reference && (
              <>
                <br />
                <small dir="ltr">
                  Inquiry Reference ID: {status.reference}
                </small>
              </>
            )}
            {!status.ok && (
              <a href={"mailto:" + profile.email}>{text.directEmail} ↗</a>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
