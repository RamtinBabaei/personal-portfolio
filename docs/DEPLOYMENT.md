# Production deployment and unattended notifications

This ZIP is source, not an already-configured deployment. Production needs a running server/Worker, persistent database and storage, valid Resend sender/key, protected owner credentials, and an enabled server-side retry schedule. Static GitHub Pages or ordinary PHP-only hosting cannot run this backend. Your laptop is not involved after deployment.

## Cloudflare Workers + D1 + R2 (matches the current stack)

Use the included lockfile. Install, configure local secrets only for local testing, run the checks and build. Do not upload .dev.vars, .env.local or .wrangler/state as public assets. Use a new Resend API key and your own verified sending domain; destination stays ramtin.babaei2002@gmail.com.

Authenticate Wrangler on your machine:

```powershell
node .\node_modules\wrangler\bin\wrangler.js login
```

For a NEW installation create a D1 database and R2 bucket; keep the returned IDs. For an existing deployment, reuse the SAME database ID and bucket name to preserve records/images. Do not create replacements for existing customer data.

```powershell
node .\node_modules\wrangler\bin\wrangler.js d1 create ramtin-portfolio-db
```
```powershell
node .\node_modules\wrangler\bin\wrangler.js r2 bucket create ramtin-portfolio-media
```
```powershell
pnpm.cmd build
```

Prepare deployment configuration with your real values. D1_ID below means the database UUID returned by Wrangler, not the all-zero local placeholder:

```powershell
node .\scripts\prepare-cloudflare.mjs ramtin-portfolio D1_ID ramtin-portfolio-db ramtin-portfolio-media https://YOUR-DOMAIN.com
```

This writes ignored wrangler.production.json with the compiled Worker/assets paths, DB/BUCKET bindings and a once-per-minute cron trigger. Re-run after each build. It does not deploy. SITE_URL and ADMIN_USERNAME are non-secret variables. The default portable authentication mode is Basic over HTTPS. Never change it to sites on a directly exposed Worker.

Back up an existing database first. For an EXISTING database, apply additive upgrades (the helper inspects columns and skips existing ones):

```powershell
pnpm.cmd db:remote:upgrade
```

Only for a NEW empty database:

```powershell
pnpm.cmd db:remote:init
```

These remote scripts explicitly target the DB in wrangler.production.json. Local db:local:* scripts never touch the production database. No DROP/TRUNCATE or deletion of inquiries is part of an upgrade.

Set each secret interactively; never put its value in source/command arguments:

```powershell
node .\node_modules\wrangler\bin\wrangler.js secret put RESEND_API_KEY --config wrangler.production.json
```

Repeat the same command, substituting the secret name, for CONTACT_FROM, RATE_LIMIT_SALT, ADMIN_PASSWORD and CRON_SECRET. CONTACT_FROM is your verified sender such as Ramtin Portfolio <contact@YOUR-VERIFIED-DOMAIN.com>. ADMIN_PASSWORD and CRON_SECRET must be DIFFERENT long random values (at least 32 characters). Local setup creates examples of suitably random private values in .dev.vars; never share or commit that file. The Resend key and sender must belong to an account permitted to send to the configured recipient.

Deploy only after configuration/checks:

```powershell
node .\node_modules\wrangler\bin\wrangler.js deploy --config wrangler.production.json
```

The Worker exports a scheduled handler. Its cron invokes drainNotifications against persistent DB records; it is not a Vite timer. Keep cron configuration in Wrangler as the single source of truth. Check Cloudflare scheduled invocation logs for Contact outbox processed when work is due. An idle run sends no mail. A cron trigger may require propagation time after deployment. If a hosting platform strips scheduled triggers, configure its server scheduler to POST the authenticated endpoint below instead; do not assume the presence of source code creates an external schedule.

Configure your custom domain using the hosting account. Keep both workers.dev and custom-domain access HTTPS and protected by the same administrator credentials. Open https://YOUR-DOMAIN.com/en/studio/inquiries and supply ADMIN_USERNAME/ADMIN_PASSWORD in the browser challenge. Public navigation does not link the private inbox.

## Standard Next.js on a Node server + Neon PostgreSQL

This optional adapter uses PrismaNeon; it is not a MySQL backend. Configure .env.local/runtime values from .env.example, DATABASE_URL, and server-only secrets. For an existing database, back it up and apply the included Prisma migrations using your existing migration history. No live PostgreSQL migration has been verified here.

```powershell
pnpm.cmd db:prisma:generate
```
```powershell
pnpm.cmd db:prisma:migrate
```
```powershell
pnpm.cmd build:next
```
```powershell
pnpm.cmd start:next
```

Run Next with the server's service manager and an HTTPS reverse proxy. The proxy must preserve Authorization for Basic auth and strip forged client-IP/identity headers. Local .wrangler/state is NOT a PostgreSQL deployment database. Existing R2 media endpoints need the BUCKET binding in Worker mode; direct Node hosting requires an appropriate storage adapter to serve previously uploaded bucket media. Existing bundled photography works normally. Use the native Worker deployment above if you need the existing full storage stack without additional integration.

A Node server has no native Cloudflare cron events. Install a durable server schedule. The included deployment/ramtin-outbox.service and .timer are systemd examples: replace the user, Node path, project path and environment-file path for your server. The private environment file must contain SITE_URL and CRON_SECRET and be readable only by the service account. Install the units on the server and enable the timer:

```sh
sudo systemctl enable --now ramtin-outbox.timer
```

The timer calls scripts/run-outbox.mjs, which POSTs /api/internal/contact-outbox with the secret in an Authorization header. It never creates test inquiries. Inspect service logs and its exit status. Keep this timer and the web service running on the server, not in a local VS Code terminal. A platform scheduler can instead make the same authenticated POST once a minute. Do not place the secret in a URL/query string. No unauthenticated GET triggers processing.

## Optional Sites gateway deployment

Use ADMIN_AUTH_MODE=sites and the correct ADMIN_USER_ID ONLY behind the Sites identity gateway. The existing ChatGPT sign-in link is retained. Standalone callers must not be able to forge gateway identity headers. An independent proxy must use proxy mode and signed timestamped identities. Configure retry scheduling with the host's supported scheduled handler or a private authenticated server job. Do not assume local Vite timers survive deployment.

## Live acceptance and recovery checklist

1. Submit the actual browser Contact form with a unique marker in the full message, including Persian and multiple lines. Do not run a CLI send command.
2. HTTP 200 requires a provider ID and saved acceptance. HTTP 202 means stored/pending and is not inbox delivery. Inspect the inquiry in the private inbox.
3. Inspect the matching provider ID in Resend and confirm the recipient is ramtin.babaei2002@gmail.com. Inspect Gmail/Spam for the SAME marker, all fields and line breaks.
4. Check scheduled runs and due/review statuses after a controlled temporary failure. Do not deliberately break production keys while real clients are submitting; automated tests already cover rejection/recovery with a simulated provider.
5. Confirm an anonymous browser cannot access private inquiry pages/APIs and that private notes never appear in an email.
6. Confirm backups, DB/R2 persistence, server logs and timer/cron status after redeployment/restart. Retain .dev.vars/.wrangler/state only on local upgrades; retain production resources for hosted upgrades.

No real Resend acceptance or Gmail receipt was available during development of this release. Production operation depends on the account/domain configuration and the host schedule being enabled.
