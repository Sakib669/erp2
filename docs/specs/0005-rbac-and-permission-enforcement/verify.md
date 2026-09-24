# Verify: RBAC and permission enforcement (spec 0005) updated 2026-09-24

Steps derived from spec 0005 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/admin/roles` : renders role listing table with system badges, description, and action buttons : AC-7
- Click "New Role" on `/admin/roles` : opens role creation modal with permission matrix grouped by module : AC-3, AC-7
- Attempt to delete a system role (for example `SUPER_ADMIN`) : interface blocks delete action or action returns error : AC-1, AC-3
- Visit `/admin/users` : renders staff employee directory with status badges and branch memberships : AC-8
- Click "Assign Roles" on user in `/admin/users` : opens modal with role selection and optional branch scope : AC-4, AC-8
- Click "Suspend Account" on active user : changes user status to SUSPENDED with immediate effect : AC-5, AC-8
- Click "Reset Password" on user : sets new password hash and forces user reauthentication : AC-5, AC-8

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run test` : runs test suite passing all RBAC integration tests : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run build` : production build succeeds generating static and dynamic routes for /admin/roles and /admin/users : AC-7, AC-8

## Acceptance criteria coverage

- AC-1 covered by seed logic and isSystem guards in rbac-actions.ts
- AC-2 covered by modular permission definitions in seed script and validation schemas
- AC-3 covered by createRoleAction, updateRoleAction, and deleteRoleAction in rbac-actions.ts
- AC-4 covered by assignUserRoleAction and revokeUserRoleAction in rbac-actions.ts
- AC-5 covered by updateUserStatusAction, adminResetPasswordAction, and updateUserBranchesAction
- AC-6 covered by requirePermission and requireRole helpers in auth-helpers.ts
- AC-7 covered by role administration view at app/admin/roles/page.tsx and role-manager.tsx
- AC-8 covered by user administration view at app/admin/users/page.tsx and user-manager.tsx
