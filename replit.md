# KaraoKê Queue

A full-stack karaoke night queue management system. Participants register with CPF, search YouTube songs, and reserve spots in the queue. Operators control playback, manage sessions, and view live stats.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `YOUTUBE_API_KEY` — YouTube Data API v3 key (returns a demo result if not set)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (Tailwind v4, shadcn/ui, Wouter routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all contracts)
- `lib/api-zod/src/generated/` — generated Zod schemas (run codegen to regenerate)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/db/src/schema/` — Drizzle ORM schema (participants, sessions, songs, reservations, queue_entries, operators)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/karaoke-queue/src/pages/` — React pages (Home, Operator, Player)

## Architecture decisions

- **Password hashing**: Node.js `crypto.pbkdf2Sync` (PBKDF2) instead of bcrypt to avoid build script approval issues. Format: `salt:hash`.
- **Operator sessions**: in-memory `Map<token, operatorId>` (not Redis/DB) — sessions are lost on server restart. Acceptable for a karaoke night session.
- **1-per-CPF rule**: Each participant may only have one QUEUED or PLAYING entry per session at a time.
- **Position compaction**: When a queue entry is finished/skipped/removed, all entries with higher positions are decremented by 1 to keep positions gapless.
- **YouTube search fallback**: If `YOUTUBE_API_KEY` is not set, returns one demo result with a message instead of crashing.

## Product

- **Home page** (`/`): Participants register by CPF, search YouTube for songs, and reserve their spot. Live queue updates every 3 seconds. "Extrato" section shows personal history for the session.
- **Operator panel** (`/operator`): Login required (default: `admin` / `admin123`). Create/pause/close sessions, see live stats, and manage the queue (finish/skip/remove entries).
- **Player** (`/player`): Full-screen YouTube player with auto-countdown between songs, auto-skip on embed errors, and fade-out controls bar.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/db run push` after any schema changes before starting the API server.
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`.
- The API server must be restarted (not just rebuilt) after adding new route files.
- Tailwind v4: `@apply dark` is invalid — use `document.documentElement.classList.add("dark")` in `main.tsx` instead.
- Operator sessions are in-memory only. A server restart requires operators to log in again.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
