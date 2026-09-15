# HVAC BIS

HVAC BIS is a frontend-only engineering workbench for organizing HVAC bid requirements, preliminary sizing, validation, traceability, and project deliverables.

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

- `artifacts/hvac-bis/src/pages/hvac-pages.tsx` — product routes and demo workflow views
- `artifacts/hvac-bis/src/components/app-shell.tsx` — responsive shell, navigation, account menu, and history panel
- `artifacts/hvac-bis/src/data/demo.ts` — clearly labeled Chennai Office HVAC prototype data
- `artifacts/hvac-bis/src/services/` — integration-pending service interfaces and adapters
- `artifacts/hvac-bis/src/domain/models.ts` — shared typed HVAC domain models
- `artifacts/hvac-bis/src/index.css` — brand tokens, light/dark themes, typography, blueprint texture, and motion

## Architecture decisions

- The first release is intentionally frontend-only; it never presents a local demo action as a successful backend operation.
- Prototype values are surfaced as `DEMO DATA`, `PRELIMINARY ESTIMATE`, or `NEEDS REVIEW` so they cannot be mistaken for engineering sign-off.
- Authentication, document processing, sizing, validation, equipment, supplier, deliverable, and audit operations are expressed as service boundaries for the future SNS Agent Workbench connection.
- Project outputs and source documents are scoped to the active project in the UI rather than shown as a global mixed feed.

## Product

- Auth-ready product entry with provider-pending login messaging
- Requirement-driven workspace for the Chennai Office HVAC demo project
- Project workspace, requirements review, bid validation, audit trail, deliverables, library, equipment/map preview, settings, and profile routes
- Responsive shell with collapsed recent-history panel showing the latest five documents

## User preferences

No additional preferences recorded.

## Gotchas

- The app is not a backend or authentication implementation yet; integration-pending states are intentional.
- Equipment and supplier views must not invent manufacturer, model, price, availability, or location claims.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
