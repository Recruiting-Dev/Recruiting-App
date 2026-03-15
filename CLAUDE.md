# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured.

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Supabase (PostgreSQL backend), Clerk (auth), Tailwind CSS.

**Environment variables required** (in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`

### Data flow

There is no API layer. Pages call Supabase directly via the client in `lib/supabase.ts`. All CRUD follows this pattern:
- Fetch: `.from('table').select('*').order(...)`
- Insert: `.from('table').insert([payload]).select()`
- Update: `.from('table').update({field}).eq('id', id)`
- Delete: `.from('table').delete().eq('id', id)`

### Pages

- **`app/page.tsx`** — Main dashboard (~1600 lines). Manages candidates and job requisitions (reqs) with two modes: `dashboard` and `analytics`. Handles inline cell editing, CSV import via PapaParse, job tab filtering, stage/status filtering, and Recharts analytics views.
- **`app/roles/page.tsx`** — Role/requisition creation form with client-side state.

### Key data models

```typescript
// Candidate stages
['Round 1', 'Round 2', 'Round 3', 'Assignment', 'Final', 'Offer', 'Pending Start', 'Offer Declined']

// Candidate statuses
['Active', 'On Hold', 'Rejected', 'Hired', 'Offer Declined']

// Req statuses
['Open', 'Hired', 'Closed']
```

Candidates have a `category` field (`'commercial'` | `'non-commercial'`) used for the job tab grouping.

### Important context

- **Permissions are temporarily disabled for go-live:** `isAdmin` is hardcoded to `true`. Clerk is configured but not enforced.
- **Build is permissive:** `next.config.ts` ignores TypeScript errors and ESLint warnings during `next build`.
- **Components directory is empty** — all UI is built inline in pages. This is intentional for now; refactoring into components is future work.
- **No API routes** — Supabase handles all backend logic directly from the client.
