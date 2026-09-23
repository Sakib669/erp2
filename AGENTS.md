# Enterprise Resource Planning System

## Stack

- **Language / Runtime**: TypeScript 5, Node.js 24
- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) with Credentials and TOTP two factor authentication
- **UI & Styling**: shadcn/ui, Tailwind CSS, Lucide icons
- **Package manager**: pnpm

## Build approach

Tracer Bullet (build vertical slices end to end through database, logic, server actions, and UI).

## Commands

```bash
# Install dependencies
pnpm install

# Dev server
pnpm run dev

# Production build
pnpm run build

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm run lint

# Generate Prisma Client
pnpm prisma generate
```

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title/index.md`.

## Rules

- Layer separation: domain logic, application actions, and infrastructure helpers remain decoupled.
- Multi tenancy: every tenant specific database query must enforce branchId isolation.
- Security: verify user permissions and branch access scope before executing server actions.
- Audit logging: record mutations and security events transactionally in AuditLog.
- Soft deletes: preserve deleted records with deletedAt timestamps; never use hard delete on domain tables.
- Input validation: Zod schemas are the single source of truth for forms and server actions.
- Currency and time: store monetary amounts as integers in minor units; store all timestamps in UTC.
- Error handling: return structured Result objects with success flag, data, or error message.

## Tooling

- Linting and formatting: ESLint with Prettier and Tailwind CSS class sorting.
- Pre commit checks: lint, format check, and TypeScript typecheck on staged files.
- Testing gate: Vitest with React Testing Library for unit and integration testing.

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
