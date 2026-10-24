# Ramtin Babaei — Personal Portfolio

A responsive personal portfolio for a frontend-focused software engineer, with bilingual pages, theme switching, motion design, selected work, and a structured contact workflow.

**React · TypeScript · Next.js/Vinext · GSAP · Cloudflare Workers · D1 · Drizzle · Vitest**

## What the project includes

- English and Persian routes with localized metadata.
- Responsive Home, Work, About, and Contact experiences.
- Reusable motion components, page transitions, magnetic interactions, and reduced-motion support.
- Selected work pages with project summaries, technology details, and direct source links.
- A validated contact form that stores complete project messages and exposes clear success and failure states.
- Durable database persistence, request validation, rate limiting, idempotency protection, and structured error handling.
- Private inquiry review routes protected by the deployment's configured authentication layer.

The public portfolio is intended for professional presentation. Demo data and environment-specific credentials are never committed to the repository.

## Run locally

Requirements:

- Node.js 22.13 or newer
- pnpm 11.25.0

~~~sh
pnpm install --prod=false --frozen-lockfile
pnpm setup:local
pnpm build
pnpm db:local:init
pnpm dev
~~~

Open:

- English: http://127.0.0.1:5173/en
- Persian: http://127.0.0.1:5173/fa
- Contact: http://127.0.0.1:5173/en/contact

For an existing local database, use the project's database upgrade command instead of reinitializing it. Keep local environment files and generated runtime state out of version control.

## Verification

~~~sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm build:next
pnpm test:integration
~~~

Automated checks cover contact validation, persistence, duplicate protection, authorization boundaries, database behavior, rendering, and integration failure paths. Live provider delivery requires deployment-specific configuration and a separate operator test.

## Project structure

~~~text
app/                 Localized pages, layouts, and API routes
components/          Contact, motion, navigation, and reusable UI
lib/                 Domain logic, validation, storage, and server utilities
db/                  Database schema and migrations
public/               Fonts, images, and static assets
tests/                Unit, integration, and end-to-end checks
docs/                 Setup, architecture, deployment, and QA notes
~~~

## Engineering notes

- The contact message is treated as a first-class domain object from form input through persistence and notification handling.
- Client and server validation share the same contract.
- Database writes use parameterized queries and explicit ownership checks.
- Public routes remain separate from protected inquiry review routes.
- Production deployment must use the same durable database and storage resources across upgrades.

## Author

Ramtin Babaei · [GitHub](https://github.com/RamtinBabaei) · [LinkedIn](https://www.linkedin.com/in/ramtin-babaei)