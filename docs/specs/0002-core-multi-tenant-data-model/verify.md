# Verify: core multi tenant data model (spec 0002) updated 2026-09-24

Steps derived from spec 0002 acceptance criteria. check verify runs these; test locks the durable ones.

## Commands

- [ ] `pnpm exec tsc --noEmit` -> passes with zero type errors -> AC-1, AC-2, AC-3, AC-4, AC-5
- [ ] `pnpm run lint` -> passes with zero warnings or errors -> AC-1, AC-2, AC-3, AC-4, AC-5
- [ ] `pnpm run test` -> runs tenant isolation and totp suites passing all 8 tests -> AC-1, AC-2, AC-3, AC-4, AC-5
- [ ] `pnpm run build` -> production build succeeds generating static and dynamic routes -> AC-1, AC-5

## Value sourcing and invariants

- [ ] Query departments via `getBranchPrisma(branchAId)` -> returns only records with `branchId = branchAId` -> AC-2
- [ ] Delete department via `getBranchPrisma` -> sets `deletedAt` timestamp and omits record from future queries -> AC-3
- [ ] Mutate setting via `withAuditTransaction` -> records `AuditLog` entry with before and after json state -> AC-4
- [ ] Update setting with stale version integer -> throws `ConcurrencyConflictError` -> AC-5
- [ ] Call `requireBranchAccess` with unassigned branch -> records `BRANCH_ACCESS_DENIED` audit log and triggers notFound -> AC-6

## Acceptance criteria coverage

- AC-1 covered by `Department` hierarchical relation test in tenant isolation suite
- AC-2 covered by branch scoped Prisma client query isolation test in tenant isolation suite
- AC-3 covered by soft delete query filtering test in tenant isolation suite
- AC-4 covered by transactional audit log before and after state diff test in tenant isolation suite
- AC-5 covered by optimistic concurrency version test in tenant isolation suite
- AC-6 covered by `requireBranchAccess` helper in `src/lib/auth-helpers.ts`
