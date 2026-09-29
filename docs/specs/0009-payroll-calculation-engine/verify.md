# Verify: Payroll calculation engine (spec 0009) updated 2026-09-29

Steps derived from spec 0009 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/payroll` : renders monthly payroll runs summary, total disbursements, and run trigger dialog : AC-7
- Click "Execute Payroll Run" on `/payroll` : validates period, selects branch, processes payslips, and prevents duplicates : AC-3, AC-6, AC-7
- Visit `/payroll/runs/[id]` : displays employee payslip roster with gross, deductions, and net figures : AC-7
- Click on individual employee payslip : opens itemized breakdown dialog with earnings and deductions lines : AC-7
- Visit `/payroll/components` : lists company salary components with fixed and percentage rules : AC-2, AC-8
- Click "Add Component" on `/payroll/components` : creates earning or deduction component : AC-2, AC-8

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- `pnpm run test` : runs test suite passing all payroll engine integration tests : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run build` : production build succeeds generating static and dynamic routes for /payroll : AC-7, AC-8

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for SalaryComponent, PayrollRun, Payslip, and PayslipItem
- AC-2 covered by createSalaryComponentAction, updateSalaryComponentAction, deleteSalaryComponentAction
- AC-3 covered by executePayrollRunAction with atomic gross, deductions, and net computation
- AC-4 covered by mid month joiner proration logic in payroll calculation engine
- AC-5 covered by unpaid leave day detection and deduction calculation
- AC-6 covered by idempotencyKey check and unique compound index in PayrollRun
- AC-7 covered by views at app/payroll/page.tsx and app/payroll/runs/[id]/page.tsx
- AC-8 covered by view at app/payroll/components/page.tsx
