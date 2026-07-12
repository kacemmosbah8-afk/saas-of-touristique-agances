# TravelOS

The operating system for travel agencies. See [`PROJECT.md`](./PROJECT.md)
for the full architecture, every decision behind it, and current project
status (what's production-ready, what's a placeholder).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui ·
PostgreSQL · Prisma · Auth.js v5 · Zod · React Hook Form · TanStack Query ·
UploadThing

## Prerequisites

- Node.js 20+
- A PostgreSQL 15+ database (a local instance or [Neon](https://neon.tech))

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` / `DIRECT_URL` — your Postgres connection string(s).
- `AUTH_SECRET` — generate with `npx auth secret`, or `openssl rand -base64 32`.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional; leave blank to disable
  Google sign-in (the Credentials provider always works).
- `UPLOADTHING_TOKEN` — optional for local dev; only required to exercise
  file uploads.

Apply the schema:

```bash
npx prisma migrate dev
```

Run the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up, and you'll be walked through
creating your first agency workspace.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks and lints) |
| `npm run start` | Run a production build |
| `npm run lint` | Lint only |
| `npx prisma studio` | Browse the database |
| `npx prisma migrate dev` | Create/apply a migration |

## Row-Level Security

`prisma/sql/001_row_level_security.sql` contains Postgres RLS policies for
defense-in-depth tenant isolation. **Do not apply this file yet** — see
`PROJECT.md` §4.3/§12 for why applying it today would break every
tenant-scoped query, and what needs to happen first.

## Project structure

See `PROJECT.md` §3 for the full folder-by-folder breakdown. Short version:
`src/app` is routing only; business logic lives in `src/features/*`
(vertical slices — actions, queries, schemas, components per domain);
cross-feature infrastructure lives in `src/shared`.
