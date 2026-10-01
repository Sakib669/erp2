# Verify: Double entry general ledger (spec 0010) updated 2026-09-29

Steps derived from spec 0010 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/accounts` : displays chart of accounts table grouped by account type with current balances : AC-2, AC-6
- Click "Add Account" on `/accounts` : creates new asset liability equity revenue or expense account : AC-2, AC-6
- Visit `/accounts/journals` : renders journal entries ledger with status badges and debit credit totals : AC-6
- Click "New Journal Voucher" on `/accounts/journals` : opens dynamic voucher creator with live balance check : AC-4, AC-6
- Click "Post" on draft journal : updates account balances atomically and locks the voucher : AC-5, AC-6
- Visit `/accounts/periods` : displays fiscal periods list with lock toggle switches : AC-3, AC-7
- Toggle period to closed and attempt posting entry in that date range : verifies operation is blocked : AC-5, AC-7

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- `pnpm run test` : runs test suite passing all general ledger integration tests : AC-1, AC-2, AC-3, AC-4, AC-5
- `pnpm run build` : production build succeeds generating static and dynamic routes for /accounts : AC-6, AC-7

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for Account, FiscalPeriod, JournalEntry, and JournalLine
- AC-2 covered by createAccountAction, updateAccountAction, deleteAccountAction
- AC-3 covered by createFiscalPeriodAction and toggleFiscalPeriodLockAction
- AC-4 covered by createJournalEntryAction with debit credit balance validation
- AC-5 covered by postJournalEntryAction with closed period check and atomic balance updates
- AC-6 covered by views at app/accounts/page.tsx and app/accounts/journals/page.tsx
- AC-7 covered by view at app/accounts/periods/page.tsx
