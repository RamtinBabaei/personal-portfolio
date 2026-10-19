# Executed verification — automatic Contact release 1.1.0

Verified 2026-10-19 in Linux with Node v24.19.0. All email requests use synthetic credentials and an isolated simulated provider; no real Resend/Gmail delivery is claimed.

## Results

| Check | Result |
| --- | --- |
| Unit tests | 106 passed in 12 files |
| Next route type generation + tsc --noEmit | Passed |
| ESLint (app/components/lib/db/tests/config/proxy) | Passed |
| Prettier check | Passed |
| Vinext/Cloudflare production build | Passed |
| Fresh extracted ZIP portable build | Passed with existing pinned dependencies; no fresh network install |
| Next.js production build and its TypeScript phase | Passed |
| Built Worker + disposable D1/R2 integration | Passed |
| Native local HTTPS bridge fixture | Passed |
| Real Wrangler local initialization/upgrade fixtures | Passed |
| Development outbox timer and read-only diagnostic | Passed |
| Fresh/repeated/local-settings upgrade helper | Passed |
| Portable production configuration generator | Passed with synthetic resource IDs; no deployment performed |

Both framework builds write generated route types under .next; run them sequentially, not concurrently. An intermediate parallel run collided in generated types. Ordered typegen/tsc/Next build subsequently passed. Non-blocking Vite messages say font API URLs resolve at runtime; the built font API was verified to return WOFF2 bytes.

## Message regression coverage

A form POST (without calling either CLI) stores the entire raw message and details.description, calls the provider directly, freezes the payload and saves its acceptance ID. Tests cover Persian UTF-8, CRLF/LF, blank lines, HTML escaping and the prominent Project Description / Client Message section. The owner-only detail API returns the full message, and the private view omits frozen email payloads. Legacy blank description metadata falls back to the saved message. The reference UUID is preserved in metadata and the email subject.

The supplied browser screenshot already showed a populated message in Request Payload. The prior ZIP contained its mapping and template. No received email/source screenshot was supplied, so the original display omission cannot be attributed conclusively to Gmail or a particular old running file. Changes harden storage/rendering and remove test-email ambiguity; they are not evidence of observed live Gmail repair.

## Automatic processing and reliability coverage

The compiled production Worker is loaded in Miniflare/workerd with disposable D1/R2 and simulated outbound Resend. Tests exercise a direct form POST and verify automatic provider invocation with all fields; HTTP 200 follows saved acceptance. A provider rejection returns HTTP 202 with a safely stored pending row. An actual scheduled event invokes the Worker scheduled handler, recovers that row and uses the identical frozen body and provider idempotency key. Repeated form requests do not send again after acceptance. Read-only contact:verify sends GET only and does not create a row/email. The optional send-test helper is explicitly separate.

Unit tests cover concurrent processor leases, cooldowns, configuration recovery, uncertain persistence after acceptance, bounded retries, expired deduplication windows, corrupt snapshots and quarantine. Unsafe old rows cannot starve safe later work. Internal notes do not enter payloads.

The development timer is tested with an injected HTTP requester: it calls the authenticated private processing endpoint automatically, continues after a simulated failure and stops scheduling when closed. The production build contains its scheduled handler and minute cron configuration. scripts/prepare-cloudflare.mjs is tested in a disposable folder for compiled paths, explicit DB/R2 resources, Basic auth defaults, minute scheduling and absence of embedded secret values.

The existing Node bridge is exercised through a real isolated Worker and native HTTP fixture: exact UTF-8 Content-Length, API header/body, fixed target, Host/Origin/token/method/size rejection, provider failures, response bounds, cancellation, TLS verification options and production isolation. External TLS to Resend was not exercised.

## Private dashboard and retained data

The built Worker denies anonymous/forged-identity access to private pages/APIs, provides an HTTP Basic challenge, and returns the owner page/API with valid synthetic credentials. It verifies the complete inquiry details, private-note editing and cross-origin write rejection. Unit tests cover closed authentication defaults, weak/incorrect/malformed credentials, explicit Sites owner requirements, unsigned proxy rejection and independent cron authentication.

SQLite tests verify search/stage/archive/read filtering, optimistic edit conflicts, meeting/follow-up fields and private notes. English/Persian dashboard markup renders. The legacy private-note/meeting table survives additive migration; repeated initialization and upgrades retain records. A published project and its referenced media stay public, drafts stay private, eight public English/Persian routes render and the contact form keeps five numbered fields. Existing personal imagery, public navigation, themes and motion components are retained.

No new destructive database migration is added. The source contains the existing additive notification snapshot migration and both database adapters. The ZIP contains no customer database or keys. Upgrading real installations requires retaining their existing DB/R2 resources.

## Verification limits

- No real Resend acceptance, delivery event or Gmail Inbox/Spam receipt was observed.
- No supported browser-control environment was available. Playwright tests are included but were not run. Browser dialog/login, actual clicks/keyboard/focus, touch behavior, responsive screenshots, perceived animation quality and visual email rendering are not verified.
- No Windows runtime or native Sites sign-in was exercised. Portable setup/paths were reviewed; tests ran in Linux.
- No live PostgreSQL migration/connection, external identity proxy integration, production host deployment, custom domain or real cron activation was performed.
- Provider acceptance is not inbox delivery. SMTP filtering, domain/account eligibility, provider outages and quota remain external conditions. Production retries require the server scheduler to be enabled as documented.

For a live check, configure secrets only locally/server-side, run the server, submit the actual form once with a unique multiline marker and do not run a send command. Match the inquiry ID/provider ID in the private dashboard and Resend, then verify the same marker and all five fields in Gmail. See START_HERE_FA.md and docs/DEPLOYMENT.md.
