# Rationale: 0006. HR Core and Employee Lifecycle

## Context

Human capital management is central to an enterprise resource planning platform. Employee profiles serve as foundational master data for attendance biometric machines, leave entitlement balances, payroll disbursement, and operational work schedules. Workforce structures require tracking designations, work shift times, physical branch assignments, and career transitions.

## Options considered

### Option 1: Simple single table employee records without transition history

- Pro: Fast to implement with minimal schema relations.
- Con: Overwriting employee branch or salary discards historical compensation records, invalidating payroll recalculations and employment dispute resolution.

### Option 2 (Chosen): Relational employee master with append only transition timeline

- Pro: Retains current state for fast operational queries while capturing an immutable audit trail of promotions, transfers, salary increments, and status changes in EmployeeTransition records.
- Con: Requires transactional coordination during employee updates to maintain both the master record and the transition event.

## Rationale

Option 2 was chosen because enterprise compliance requires provable employment history. Storing base salaries as integer minor units prevents fractional rounding discrepancies when calculating payroll deductions and allowances. Scoping work shifts and employee records to physical branch identifiers enforces tenant isolation.

## References

None. Standard enterprise human resources architecture applied directly.
