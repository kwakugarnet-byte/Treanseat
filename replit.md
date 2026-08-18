# Bike Manager

An operations dashboard for managing bikes, riders, sales, maintenance, reporting, and snooker sessions.

## Run & Operate

- `pnpm --filter @workspace/bike-manager run dev` — run the Bike Manager frontend
- `pnpm --filter @workspace/api-server run dev` — run the API server
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

- `artifacts/bike-manager` — React/Vite dashboard and existing staff PIN login
- `artifacts/api-server` — Express API routes, including authentication
- `lib/db/src/schema` — Drizzle database schema
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react` and `lib/api-zod` — generated API clients and validation schemas

## Architecture decisions

- The existing staff PIN login is preserved: the frontend stores its bearer token in local storage and the API hashes PINs with SHA-256.
- The frontend and API remain separate workspace artifacts and communicate through the `/api` path.
- API client and Zod code are generated from the OpenAPI contract; regenerate after changing the contract.

## Product

Staff can sign in, view operational summaries, manage bikes and riders, record sales and maintenance, review profit and reports, manage users, and track snooker sessions.

## User preferences

Keep the existing login behavior and project structure when restoring or extending the app.

## Gotchas

- The development database schema must be pushed before the API can serve staff or dashboard data.
- A fresh development database has no staff accounts; the login screen will show no accounts until staff data exists.
- Use Orval 8.9.1 with the current Zod 3 workspace catalog for compatible code generation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
