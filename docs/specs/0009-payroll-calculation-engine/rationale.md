# Rationale: Payroll calculation engine (spec 0009)

## Context

Managing enterprise compensation requires reliable calculation pipelines that handle base wages, statutory and discretionary components, mid month hire adjustments, unpaid leave deductions, and duplicate payment prevention.

## Decisions

### 1. Integer storage in minor currency units

- Decision: Store all salaries, component amounts, gross totals, deductions, and net figures as integers in minor currency units such as cents.
- Why: Floating point arithmetic introduces rounding drift when summing thousands of line items across months. Integer arithmetic provides exact financial determinism.

### 2. Idempotency key per branch and period

- Decision: Enforce a unique constraint on `[companyId, branchId, year, month]` with an explicit `idempotencyKey` string format.
- Why: Accidental double clicks or concurrent batch worker invocations must never generate duplicate payslips or multiple disbursements for the same payroll cycle.

### 3. Integrated attendance and unpaid leave deduction

- Decision: Check `AttendanceRecord` and `LeaveRequest` during payroll generation to determine unpaid absences and deduct daily wage equivalents automatically.
- Why: Manual cross checking between time cards and payroll ledgers causes payment delays and calculation disputes. Automated cross module synchronization guarantees consistency.

### 4. Mid month joiner proration formula

- Decision: Calculate the proration ratio as `(totalDaysInMonth - joinDay + 1) / totalDaysInMonth` when an employee joins after the first calendar day of the run period.
- Why: Fair compensation requires paying employees precisely for the active days worked in their initial month.
