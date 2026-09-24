# Verify: HR core and employee lifecycle (spec 0006) updated 2026-09-25

Steps derived from spec 0006 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/hr` : renders staff directory table with designation, department, branch, status badges, and search filtering : AC-6
- Click "New Employee" on `/hr` : opens employee enrollment modal with personal, department, and salary inputs : AC-3, AC-6
- Visit `/hr/employees/[id]` : renders employee profile, salary breakdown, and career transition timeline : AC-7
- Click "Record Transition" on `/hr/employees/[id]` : logs promotion, transfer, or salary adjustment with effective date : AC-4, AC-7
- Visit `/hr/designations` : renders designation management table with modal dialogs : AC-2, AC-8
- Visit `/hr/shifts` : renders work shifts table scoped to active physical branch : AC-2, AC-8

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run test` : runs test suite passing all HR core integration tests : AC-1, AC-2, AC-3, AC-4, AC-5
- `pnpm run build` : production build succeeds generating static and dynamic routes for /hr : AC-6, AC-7, AC-8

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for Designation, Shift, Employee, and EmployeeTransition
- AC-2 covered by createDesignationAction, updateDesignationAction, createShiftAction, updateShiftAction
- AC-3 covered by createEmployeeAction and Zod validation schemas in validations/hr.ts
- AC-4 covered by recordEmployeeTransitionAction with immutable history logging
- AC-5 covered by deleteEmployeeAction with soft delete deletedAt timestamp
- AC-6 covered by HR directory view at app/hr/page.tsx and employee-manager.tsx
- AC-7 covered by employee detail view at app/hr/employees/[id]/page.tsx and employee-detail.tsx
- AC-8 covered by designation and shift views at app/hr/designations and app/hr/shifts
