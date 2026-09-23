# 0001 · stack and architecture

**Status**: Assumed
**Date**: 2026-09-23
**Authorized by**: user, during /develop

## Owed decision

Selection and configuration of Next.js 15 App Router, Prisma ORM with PostgreSQL, Auth.js v5 credentials and two factor authentication, and shadcn/ui components.

## Assumption built on

Stack: Next.js 15 (App Router, Server Components, Server Actions, Route Handlers), TypeScript, Tailwind CSS, PostgreSQL via Prisma ORM, Auth.js (NextAuth v5) with Credentials and two factor TOTP authentication, shadcn/ui component library, and pnpm package manager.

## Code area

`./` (`package.json`, `prisma/schema.prisma`, `src/app/`, `src/lib/`, `src/components/`)

## Requirements

AC-1: Project scaffolded with Next.js 15, TypeScript, Tailwind CSS, and pnpm.
AC-2: Prisma schema configured with PostgreSQL provider and core foundational models (Company, Branch, User, Role, Permission, UserRole, UserBranch, AuditLog, Setting).
AC-3: shadcn/ui and Tailwind styling configured with theme tokens and base primitives.
AC-4: Auth.js v5 setup with credentials authentication, session management, and branch context support.
AC-5: Project compiles cleanly with zero TypeScript or build errors.

## Ratify

This decision was recorded by /develop, not deliberated. Run `/architect stack and architecture`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
