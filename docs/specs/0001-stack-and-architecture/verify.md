# Verify: stack and architecture · spec 0001 · updated 2026-09-23

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Visit `/` -> renders enterprise welcome view and system health status -> AC-3
- [ ] Visit `/login` -> renders enterprise sign in card with email, password, and two factor authentication code input -> AC-4

## Commands

- [ ] `pnpm exec tsc --noEmit` -> passes with zero type errors -> AC-1, AC-5
- [ ] `pnpm run build` -> production build succeeds generating static and dynamic routes -> AC-1, AC-3, AC-5
- [ ] `pnpm prisma generate` -> Prisma client generates successfully -> AC-2

## Acceptance criteria coverage

- AC-1 covered by `pnpm exec tsc --noEmit` and `pnpm run build`
- AC-2 covered by `pnpm prisma generate`
- AC-3 covered by `/` view and `pnpm run build`
- AC-4 covered by `/login` view
- AC-5 covered by `pnpm exec tsc --noEmit` and `pnpm run build`
