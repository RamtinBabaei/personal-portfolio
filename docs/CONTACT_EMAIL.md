# Contact message and automatic notification contract

## Investigation: evidence and root causes

The supplied browser Request Payload contained the complete `message`. The previous final ZIP also registered `message`, validated it, stored it (both in an aggregate message and details.description), and included it in email HTML/text. Automated tests reproduced that mapping. A received Gmail message/source was not provided; the exact cause of the originally reported invisible text cannot be proven. It would be inaccurate to claim a confirmed Gmail-side or field-name bug.

The old HTML placed the project description after the metadata table, relied on CSS white-space, and reused the same subject for many inquiries. Its test command created a DIFFERENT synthetic inquiry with its own generic message. These made testing and identifying real messages confusing. This release uses raw canonical message storage, one shared description fallback for old data, a first-position Project Description / Client Message section, escaped HTML with explicit line breaks, table-based email structure and a unique inquiry UUID in every subject. Empty historical description metadata falls back to the saved message. Nothing can reconstruct text that never reached an old database record.

`contact:verify` previously performed a new POST to /api/contact with a new UUID and CONTACT-CHECK message. It never drained a queue, verified an earlier inquiry, synchronized records or dispatched the preceding visitor's form. Real submissions already called the provider synchronously. It is now a read-only GET check. Explicit synthetic sending is separately named `contact:send-test` and announced as a NEW inquiry.

The actual reliability gap was unattended retries: the prior release had durable rows, leases and retry timestamps but no scheduler. This release connects those existing records to production scheduled execution, a private scheduler endpoint and a development timer. Normal form submission sends immediately without either CLI command.

## Five-field flow

Textarea register(message) -> POST JSON message -> strict Zod validation (20–5000 characters) -> inquiries.message (complete raw text) and details.description -> notificationEmail -> Resend. The protected inquiry detail API and dashboard use the same details helper and display the complete description with pre-wrap. Company is optional; selected services are real form data. Existing old aggregate messages remain readable.

Inquiry Reference ID is the original database inquiry UUID, not a secret or an email address. It ties the form receipt, stored row, subject, outbox and private dashboard together. Provider email ID is a separate identifier; it appears in the owner dashboard for provider investigation. UUIDs do not grant public access to records.

The only recipient is ramtin.babaei2002@gmail.com. Reply-To is the client's validated email. Sender/recipient overrides are rejected. Internal notes, meeting notes and follow-up fields never enter email payloads. HTML escapes &, <, >, quotes and apostrophes before converting CRLF/LF to <br>. Plain text retains the complete original message. Unique subjects help identify new inquiries; Gmail display behavior is not guaranteed.

## Status and reliability

- HTTP 200: provider returned an email ID AND its acceptance status was stored. Only this response clears the form.
- HTTP 202: inquiry safely stored; provider acceptance pending and automatic retry enabled. Form remains visible, and a reference is shown. This is not an email success/delivery claim.
- HTTP 409: a lease/cooldown is active or manual review is required; no duplicate dispatch occurs.
- HTTP 503 ACCEPTED_STORAGE_UNCERTAIN: provider accepted, but saving that result was uncertain. A later processor reuses the identical provider key/body within the bounded window.
- HTTP 422/400/403/429: input/origin/spam/rate validation failed. No accepted-email claim is made.

Provider acceptance is distinct from mailbox delivery. This release does not implement inbox/open webhooks. Inspect the provider ID in Resend and verify Gmail/Spam for real delivery.

An atomic 60-second database lease protects concurrent sends. The payload is frozen on the first provider attempt. Every retry uses that byte-identical payload and the original Idempotency-Key. Six attempts maximum, exponential delays starting at one minute. Automatic attempts stop before 23 hours after the first attempt to stay inside Resend's documented 24-hour retention. Unsafe old snapshots/expired retries are quarantined as REVIEW_REQUIRED so they cannot starve the worker batch. Accepted records are never resent. Attempts are bounded; permanent account/domain/quota errors still need operator correction. Delivery cannot be guaranteed through permanent provider failure.

A cron run takes up to ten due records sequentially. A job with no work sends no email. Overlapping HTTP/scheduled/dev runs are safe through the same lease. The public form does not wait for unrelated historical requests. Once automatic processing is enabled, safe due older records can be attempted; audit pending records before first deployment if old test rows should not be sent. Previously attempted rows without a frozen payload are quarantined instead of reconstructed under an old provider key.

## Configuration

RESEND_API_KEY and CONTACT_FROM are server-only. Use your own verified sender domain for production. Gmail is the DESTINATION and must not be CONTACT_FROM. onboarding@resend.dev is suitable only if the owner's Gmail is permitted by the Resend account. No Gmail password is needed. Revoke previously shared keys and configure a new one locally/server-side.

CRON_SECRET is an independent random value of at least 32 characters for the private HTTP scheduler endpoint. The native Cloudflare scheduled event does not need an HTTP secret; portable Node schedulers do. ADMIN_PASSWORD is a different long random value, and HTTP Basic is restricted to HTTPS outside loopback. ADMIN_AUTH_MODE=sites is only for trusted Sites gateway hosting; never enable it on a directly exposed standalone Worker. Proxy mode requires an owner ID and a signed, timestamp-bounded identity from a trusted proxy.

CONTACT_RATE_LIMIT_PER_HOUR accepts 1–100, default 5. setup:local adds 100 for convenient local testing. Rate limiting is per salted client IP. A standalone proxy must strip forged CF-Connecting-IP and supply a trusted value; absent trusted IP all requests share a conservative bucket. Do not disable production spam protection merely for local testing.

## Upgrades

No destructive migration is introduced. Keep existing D1/R2 or PostgreSQL data. The included notificationPayload migration is additive and the local/remote helpers inspect columns before applying it. Legacy private notes and meeting tables are retained. Old already-accepted email snapshots are not rewritten or resent merely to change formatting. The new template applies to new unsent notifications; accepted mail in Gmail cannot be edited.

Official references reviewed 2026-10-19:
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
