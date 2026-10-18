# KaamSetu

A mobile-first demo marketplace that helps local workers find fair work and employers connect with skilled people nearby.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kaamsetu/` — KaamSetu web app and visual theme
- `artifacts/api-server/src/routes/` — marketplace, worker, application, and review API
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — PostgreSQL table definitions

## Architecture decisions

- Demo users share the project database; there is no sign-in or identity verification.
- Sample listings and profiles are explicitly marked as demo data.
- Employer verification is always shown as unverified; listing creators cannot set their own status.
- Job matching uses skills, location, and availability and returns the reasons for each match.

## Product

Workers can create profiles, browse and filter local jobs, see explainable matches, apply, and follow application statuses. Employers can post listings, see matching workers, and respond to applications. Community members can flag suspicious listings for a human review queue. The dashboard summarizes listings, profiles, applications, successful connections, and pending review reports.

## User preferences

- Keep the UI mobile-first, readable, and easy to navigate for people with limited digital literacy.
- Use the requested green-and-cream theme and large controls.
- Never label an employer verified without a real verification process.

## Gotchas

- The app is a shared demo experience, not an authenticated production marketplace; do not imply that profiles or listings belong to a signed-in identity.
- Demo listings are illustrative and must remain clearly labeled as samples.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
