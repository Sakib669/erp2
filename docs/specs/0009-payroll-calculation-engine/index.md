# 0009. Payroll Calculation Engine

**Date**: 2026-09-29
**Status**: Complete

## Summary

This specification establishes the payroll calculation engine, salary components, monthly payroll runs with background execution, mid month joiner proration, attendance based unpaid leave deductions, and idempotent payslip generation for our enterprise resource planning system. It provides accurate gross to net calculations storing monetary figures as integer minor units in cents and enforcing branch level access boundaries.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0009-payroll-calculation-engine/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0009-payroll-calculation-engine/verify.md).

## Requirements

**User stories**:

- As an HR and finance officer, I want to configure earnings and deductions components with fixed amounts or percentages of base salary.
- As a payroll manager, I want to execute monthly payroll runs for a specific branch and period with an idempotency key preventing duplicate runs.
- As an accountant, I want new employees who join mid month to have their base earnings prorated according to active calendar days.
- As an administrator, I want unpaid leave days from attendance and leave records to automatically deduct from gross pay.
- As an employee, I want to view detailed itemized payslips showing gross earnings, deductions breakdown, and net salary.

**Acceptance criteria**:

- **AC-1**: Database schema models `SalaryComponent`, `PayrollRun`, `Payslip`, and `PayslipItem` with strict multi tenant company and branch isolation, integer currency storage in minor units, and soft delete timestamps.
- **AC-2**: Server actions in [src/actions/payroll-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/payroll-actions.ts) provide validated CRUD operations for salary components.
- **AC-3**: Payroll execution action `processPayrollRunAction` computes gross, deductions, and net salary for all active branch employees within an atomic transaction.
- **AC-4**: Mid month joiner proration calculates the ratio of active working days in the month to total days in the month and scales base salary accordingly.
- **AC-5**: Unpaid absences and unpaid leave days deduct daily wage equivalents from the payable base amount.
- **AC-6**: Idempotency key `PAYROLL-[branchId]-[year]-[month]` strictly prevents duplicate payroll run submissions for the same period.
- **AC-7**: Payroll management views at `/payroll` and `/payroll/runs/[id]` render execution summaries, batch metrics, and employee payslips with full itemized breakdowns.
- **AC-8**: Component configuration view at `/payroll/components` allows managing allowance and deduction rules.

## Feature design

**Data model sketch**:

- `SalaryComponent`: id, companyId, name, code, type (EARNING, DEDUCTION), calculationType (FIXED, PERCENTAGE_OF_BASIC), defaultAmount, isTaxable, deletedAt, timestamps. Unique on `[companyId, code]`.
- `PayrollRun`: id, companyId, branchId, year, month, status (DRAFT, PROCESSING, COMPLETED, CANCELLED), totalGross, totalDeductions, totalNet, employeeCount, idempotencyKey, notes, processedByUserId, processedAt, deletedAt, timestamps. Unique on `[companyId, branchId, year, month]`.
- `Payslip`: id, payrollRunId, employeeId, branchId, year, month, baseSalary, grossEarnings, totalDeductions, netSalary, workingDays, paidDays, unpaidLeaveDays, prorationRatio, status (DRAFT, APPROVED, PAID, CANCELLED), paymentDate, paymentMethod, deletedAt, timestamps. Unique on `[payrollRunId, employeeId]`.
- `PayslipItem`: id, payslipId, salaryComponentId, name, code, type, amount, timestamps.

**API and Server Action surface**:

| Function                      | Module               | Key inputs                                                  | Key outputs                         | Auth requirement              | Key errors            |
| ----------------------------- | -------------------- | ----------------------------------------------------------- | ----------------------------------- | ----------------------------- | --------------------- |
| `createSalaryComponentAction` | `payroll-actions.ts` | companyId, name, code, type, calculationType, defaultAmount | Result with SalaryComponent         | SUPER_ADMIN or PAYROLL_MANAGE | 409 code exists       |
| `updateSalaryComponentAction` | `payroll-actions.ts` | componentId, updates                                        | Result with SalaryComponent         | SUPER_ADMIN or PAYROLL_MANAGE | 404 not found         |
| `deleteSalaryComponentAction` | `payroll-actions.ts` | componentId                                                 | Result with boolean                 | SUPER_ADMIN or PAYROLL_MANAGE | 400 in use            |
| `getSalaryComponentsAction`   | `payroll-actions.ts` | companyId                                                   | Result with list                    | PAYROLL_VIEW                  | 403 unauthorized      |
| `executePayrollRunAction`     | `payroll-actions.ts` | branchId, year, month, notes                                | Result with PayrollRun              | SUPER_ADMIN or PAYROLL_MANAGE | 409 already processed |
| `getPayrollRunsAction`        | `payroll-actions.ts` | branchId, year                                              | Result with list                    | PAYROLL_VIEW                  | 403 unauthorized      |
| `getPayrollRunDetailsAction`  | `payroll-actions.ts` | runId                                                       | Result with PayrollRun and Payslips | PAYROLL_VIEW                  | 404 not found         |
| `getPayslipDetailsAction`     | `payroll-actions.ts` | payslipId                                                   | Result with Payslip and Items       | Authenticated User            | 404 not found         |
| `markPayslipsPaidAction`      | `payroll-actions.ts` | runId, paymentMethod                                        | Result with boolean                 | SUPER_ADMIN or PAYROLL_MANAGE | 400 not completed     |

**Value sourcing**:

| Action or display      | Value produced or displayed | Source                                                                               |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| Proration ratio        | Float between 0.0 and 1.0   | If employee joined in run month: (totalDaysInMonth - joinDay + 1) / totalDaysInMonth |
| Base payable salary    | Integer in minor units      | Math.round(baseSalary * prorationRatio)                                              |
| Daily wage             | Integer in minor units      | Math.round(baseSalary / totalDaysInMonth)                                            |
| Unpaid leave deduction | Integer in minor units      | dailyWage * unpaidLeaveDaysCount                                                     |
| Component earnings     | Integer in minor units      | Fixed amount or Math.round(basePayable * percentage / 10000)                         |
| Net salary             | Integer in minor units      | grossEarnings - totalDeductions                                                      |

**Key invariants**:

- All monetary values are strictly stored as integers representing minor currency units (cents).
- Net salary cannot drop below zero.
- Each branch can only have one completed payroll run per year and month.
- Mid month joiner proration is mathematically exact and deterministic.
- All state mutations produce transactional records in AuditLog.

## Build plan

- [x] Step 1: Add SalaryComponent, PayrollRun, Payslip, and PayslipItem models and enums to Prisma schema and execute database push, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for components, payroll execution, and payslips in [src/lib/validations/payroll.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/payroll.ts), satisfies **AC-2**, **AC-3**, **AC-6**
- [x] Step 3: Implement calculation engine and server actions in [src/actions/payroll-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/payroll-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**
- [x] Step 4: Build salary component management view at `/payroll/components`, satisfies **AC-8**
- [x] Step 5: Build payroll runs overview view at `/payroll` and detailed run inspection view at `/payroll/runs/[id]`, satisfies **AC-7**
- [x] Step 6: Author integration test suite covering proration, components, unpaid leave deductions, and idempotency in [src/**tests**/payroll.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/payroll.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:

- Automated proration eliminates human math errors for mid month hires.
- Idempotency guarantees prevent costly duplicate employee salary payouts.
- Integer minor units prevent floating point rounding inaccuracies across currency totals.

**Tradeoffs**:

- Static calendar day proration assumes uniform 30 day convention or actual month days according to company setting.
