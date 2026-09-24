# Verify: identity, auth and branch context (spec 0004) updated 2026-09-24

Steps derived from spec 0004 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/org` : renders branch management cards with headquarters badge, create modal, and edit modal : AC-6
- Click "New Branch" dialog on `/org` : opens branch creation modal with code, name, timezone, address fields, and validates required fields : AC-2, AC-6
- Click "Delete Branch" on non headquarters branch : marks branch as deleted with soft deletion timestamp : AC-4
- Visit `/org/departments` : renders hierarchical parent and child departmental tree scoped to branch : AC-7
- Click "New Department" on `/org/departments` : creates department nested under parent department : AC-2, AC-7
- Attempt to switch active branch via BranchSwitcher : validates branch assignment and sets active branch cookie : AC-5
- Visit `/settings` two factor security tab : renders QR code, secret key, and backup codes for authenticator pairing : AC-1

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run test` : runs unit and integration test suite passing all tests : AC-1, AC-2, AC-3, AC-4, AC-5, AC-8
- `pnpm run build` : production build succeeds generating static and dynamic routes : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8

## Acceptance criteria coverage

- AC-1 covered by two factor setup modal in two-factor-setup.tsx, setupTwoFactorAction, and confirmTwoFactorAction
- AC-2 covered by Zod schemas in validations/org.ts and CRUD actions in org-actions.ts
- AC-3 covered by withAuditTransaction in org-actions.ts recording AuditLog entries
- AC-4 covered by soft delete logic setting deletedAt timestamp in deleteBranchAction and deleteDepartmentAction
- AC-5 covered by setActiveBranchAction in branch-actions.ts and BranchSwitcher component
- AC-6 covered by organization management view in app/org/page.tsx and branch-manager.tsx
- AC-7 covered by department management view in app/org/departments/page.tsx and department-manager.tsx
- AC-8 covered by resetUserTwoFactorAction in auth-actions.ts with transactional audit logging
