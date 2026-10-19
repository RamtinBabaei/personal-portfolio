# Ramtin Babaei — portfolio, complete inquiries and automatic notifications

React, TypeScript, Next.js/Vinext and GSAP portfolio with English/Persian, themes, photography, public Work pages, a five-question contact form and a private inquiry dashboard. Public design and motion are retained.

Start with [START_HERE_FA.md](START_HERE_FA.md). Read [docs/CONTACT_EMAIL.md](docs/CONTACT_EMAIL.md) for the email contract, [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup and [docs/QA.md](docs/QA.md) for executed verification and limits.

A real form POST stores the full `message`, sends immediately and returns HTTP 200 only after provider acceptance and its saved email ID. Failures remain stored for unattended retries. HTTP 202 means **saved, email acceptance pending**, not delivery. Accepted mail is not resent. HTML and text emails show Project Description / Client Message and Inquiry Reference ID; internal notes never appear in email.

`pnpm contact:verify` is now a read-only health check. It does not dispatch pending mail or create a test inquiry. An optional, deliberately named `pnpm contact:send-test` creates a NEW synthetic inquiry/test email. Neither command is required after real form submissions.

## Local setup

Node >=22.13.0 and pnpm 11.25.0. Execute commands separately:

```sh
pnpm install --prod=false --frozen-lockfile
```
```sh
pnpm setup:local
```

Edit `.dev.vars`: set a NEW private RESEND_API_KEY and permitted CONTACT_FROM. Recipient is fixed to ramtin.babaei2002@gmail.com. setup:local preserves existing values and adds missing local scheduler/admin defaults. Never commit this file.

```sh
pnpm build
```

For an existing copied database use `pnpm db:local:upgrade`; for a fresh one:

```sh
pnpm db:local:init
```
```sh
pnpm dev
```

Open http://127.0.0.1:5173/en/contact or /fa/contact. Submit normally; no second terminal command is needed. Immediate sends and retry attempts use the development HTTPS bridge. A timer in the same dev process calls the private outbox endpoint once a minute; it stops with the server. Production uses a server-side scheduler and does not need your computer.

## Private review

Open /en/studio/inquiries or /fa/studio/inquiries. Portable/local mode uses HTTP Basic: username ADMIN_USERNAME and the generated ADMIN_PASSWORD from .dev.vars. Browser credentials require HTTPS except on loopback. View complete messages, provider acceptance IDs, filters, stages, read/archive flags, private notes, meeting notes and follow-ups. These routes are protected independently of public navigation. Close the private browser session after using HTTP Basic; there is no application session token to sign out.

Sites deployments can retain native ChatGPT sign-in using ADMIN_AUTH_MODE=sites and ADMIN_USER_ID. Only use this mode behind the Sites gateway that owns identity headers. An independent signed identity proxy uses ADMIN_AUTH_MODE=proxy, ADMIN_USER_ID and IDENTITY_PROXY_SECRET. Direct Cloudflare/Node deployments default to Basic, never caller-supplied identity headers.

## Checks

pnpm test; pnpm typecheck; pnpm lint; pnpm format:check; pnpm build; pnpm build:next; pnpm test:integration. Integration tests intentionally log simulated provider/transport failures before PASS. They send no real email. Real Resend acceptance/Gmail arrival requires your configured live test; no claim of inbox delivery is made by automated tests.

## Upgrades and retained data

Extract into a new folder, stop the old server and preserve `.dev.vars` plus `.wrangler/state` (local DB and object storage). Run setup:local, build and db:local:upgrade. Existing deployed installations must keep the SAME production database/bucket and apply additive upgrades only. No new schema change beyond the previous notification snapshot migration is required; legacy notes/meeting tables are retained. Never replace a production database with the empty archive.

The ZIP includes all source/assets/lockfile/tests/migrations/docs. It excludes keys, installed dependencies, build output and customer database/media state. Published projects and public media still work; the project editor remains absent. Future projects can be maintained with trusted database/storage tooling.
