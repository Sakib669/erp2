# 0008. Leave Management Engine

**Date**: 2026-09-25
**Status**: Complete

## Summary

This specification establishes the leave management engine, leave categories, yearly accrual balances, approval workflows, and automated attendance synchronization for our enterprise resource planning system. It provides employee leave applications with strict balance checks preventing negative balances, supervisory approval or rejection with audit logging, automatic deduction from employee balances, and seamless synchronization into daily attendance records.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0008-leave-management-engine/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0008-leave-management-engine/verify.md).

## Requirements

**User stories**:

- As an employee, I want to view my allocated leave balances and submit time off requests with date ranges and reasons.
- As an HR manager, I want to configure leave categories with annual entitlements, paid or unpaid flags, and carry forward maximums.
- As a branch supervisor, I want to review pending leave requests and approve or reject them with documented notes.
- As an operations coordinator, I want approved leaves to automatically mark employees as ON LEAVE on daily attendance rosters.

**Acceptance criteria**:

- **AC-1**: Database schema models `LeaveType`, `LeaveBalance`, and `LeaveRequest` with strict company and branch isolation, foreign key cascading rules, and soft delete timestamps.
- **AC-2**: Server actions in [src/actions/leave-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/leave-actions.ts) provide validated CRUD operations for Leave Categories.
- **AC-3**: Leave application action `submitLeaveRequestAction` verifies that requested days do not exceed available balance and locks pending days atomically.
- **AC-4**: Approval action `approveLeaveRequestAction` moves pending days to used days, logs audit records inside `withAuditTransaction`, and generates ON LEAVE records in `AttendanceRecord`.
- **AC-5**: Rejection action `rejectLeaveRequestAction` releases pending days back to available balance with mandatory rejection notes.
- **AC-6**: Leave management view at `/leave` displays balance summaries, request queues with status badges, and request submission dialogs.
- **AC-7**: Leave policy configuration view at `/leave/types` provides operational controls for annual quotas and carry forward policies.

## Feature design

**Data model sketch**:

- `LeaveType`: id, companyId, name, code, description, defaultDaysPerYear, isPaid, requiresApproval, carryForwardMaxDays, deletedAt, timestamps. Unique on `[companyId, code]`.
- `LeaveBalance`: id, employeeId, leaveTypeId, year, entitledDays, carriedForwardDays, usedDays, pendingDays, deletedAt, timestamps. Unique on `[employeeId, leaveTypeId, year]`.
- `LeaveRequest`: id, employeeId, branchId, leaveTypeId, startDate, endDate, daysCount, reason, status (PENDING, APPROVED, REJECTED, CANCELLED), approvedByUserId, approvalNotes, rejectionReason, approvedAt, deletedAt, timestamps.

**API and Server Action surface**:

| Function                         | Module             | Key inputs                                                     | Key outputs               | Auth requirement         | Key errors                           |
| -------------------------------- | ------------------ | -------------------------------------------------------------- | ------------------------- | ------------------------ | ------------------------------------ |
| `createLeaveTypeAction`          | `leave-actions.ts` | companyId, name, code, defaultDaysPerYear, isPaid              | Result with LeaveType     | SUPER_ADMIN or HR_MANAGE | 409 code exists                      |
| `updateLeaveTypeAction`          | `leave-actions.ts` | leaveTypeId, update fields                                     | Result with LeaveType     | SUPER_ADMIN or HR_MANAGE | 404 not found                        |
| `deleteLeaveTypeAction`          | `leave-actions.ts` | leaveTypeId                                                    | Result with boolean       | SUPER_ADMIN or HR_MANAGE | 400 active balances exist            |
| `submitLeaveRequestAction`       | `leave-actions.ts` | employeeId, leaveTypeId, startDate, endDate, daysCount, reason | Result with LeaveRequest  | Authenticated User       | 400 insufficient balance             |
| `approveLeaveRequestAction`      | `leave-actions.ts` | requestId, approvalNotes                                       | Result with LeaveRequest  | SUPER_ADMIN or HR_MANAGE | 404 not found, 400 already processed |
| `rejectLeaveRequestAction`       | `leave-actions.ts` | requestId, rejectionReason                                     | Result with LeaveRequest  | SUPER_ADMIN or HR_MANAGE | 400 reason required                  |
| `cancelLeaveRequestAction`       | `leave-actions.ts` | requestId                                                      | Result with boolean       | Authenticated User       | 400 cannot cancel past leave         |
| `getLeaveRequestsAction`         | `leave-actions.ts` | branchId, employeeId, status, year                             | Result with requests list | HR_VIEW                  | 403 unauthorized                     |
| `getEmployeeLeaveBalancesAction` | `leave-actions.ts` | employeeId, year                                               | Result with balances list | Authenticated User       | 404 employee not found               |

**Value sourcing**:

| Action or display     | Value produced or displayed              | Source                                                                                 |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Leave balance cards   | Available, used, and pending days        | Calculated from LeaveBalance where available = (entitled + carried) - (used + pending) |
| Leave request rows    | Employee requests with status badges     | Query on LeaveRequest joined with Employee and LeaveType                               |
| Daily attendance sync | AttendanceRecord populated with ON LEAVE | Generated upon leave approval across dates between startDate and endDate               |
| Audit before snapshot | State before approval or rejection       | Fetched from LeaveRequest and LeaveBalance prior to mutation                           |

**Key invariants**:

- Available leave balance cannot drop below zero.
- Approved leave requests automatically synchronize with AttendanceRecord.
- Soft deleted leave types or requests preserve historical financial and payroll records.
- Branch level data segregation is maintained for all leave views and actions.

## Build plan

- [x] Step 1: Add LeaveType, LeaveBalance, and LeaveRequest models and enums to Prisma schema and execute database push, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for leave categories, requests, approvals, and balance queries in [src/lib/validations/leave.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/leave.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 3: Implement Leave engine server actions (Category CRUD, Submission, Approval, Rejection, Attendance sync) in [src/actions/leave-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/leave-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Build leave management dashboard at `/leave` with balance summaries and approval workflow dialogs, satisfies **AC-6**
- [x] Step 5: Build leave policy configuration view at `/leave/types`, satisfies **AC-7**
- [x] Step 6: Author integration test suite covering balance validation, pending locks, approval attendance sync, and rejection release in [src/**tests**/leave.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/leave.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Automated balance management prevents over-allocation of paid time off.
- Seamless attendance integration ensures staff on leave are not flagged as absent.
- Strict audit trail supports compliance with statutory employment leave regulations.

**Tradeoffs**:

- Cross calendar year leaves (starting in December and ending in January) require splitting across respective annual balance ledgers.
