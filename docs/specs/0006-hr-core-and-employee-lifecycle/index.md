# 0006. HR Core and Employee Lifecycle

**Date**: 2026-09-25
**Status**: Complete

## Summary

This specification establishes human resources core data models, employee directories, designations, work shifts, and lifecycle transitions for our enterprise resource planning system. It provides employee profile administration, department and designation assignments, physical branch transfers, compensation adjustments, and immutable career transition history. All mutations enforce Zod validation, soft deletion, and transactional audit logging.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0006-hr-core-and-employee-lifecycle/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0006-hr-core-and-employee-lifecycle/verify.md).

## Requirements

**User stories**:

- As an HR manager, I want to create and manage designations, work shifts, and employee profiles so that workforce structure is organized accurately per branch.
- As an operations director, I want to transfer employees between branches and departments with recorded effective dates and reason logs.
- As a finance officer, I want base salaries stored in minor integer units with complete transition history for compensation adjustments.
- As a department head, I want to view active staff lists filtered by physical branch and department.

**Acceptance criteria**:

- **AC-1**: Database schema models `Designation`, `Shift`, `Employee`, and `EmployeeTransition` with strict branch isolation and soft delete timestamps.
- **AC-2**: Server actions in [src/actions/hr-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/hr-actions.ts) provide validated CRUD operations for Designations and Work Shifts.
- **AC-3**: Employee enrollment action validates required personal, departmental, and compensation fields using Zod schemas, generating unique employee numbers.
- **AC-4**: Employee transition action records career events (promotions, branch transfers, department reassignments, salary adjustments, resignations) inside `withAuditTransaction`, preserving immutable `EmployeeTransition` history.
- **AC-5**: Soft deleting an employee record populates `deletedAt` without deleting historical financial or attendance ledger rows.
- **AC-6**: HR management view at `/hr` renders staff directory tables, filterable by physical branch, department, and employment status.
- **AC-7**: Employee profile and lifecycle history view at `/hr/employees/[id]` displays personal details, current assignments, compensation, and transition timeline.
- **AC-8**: Designation and Shift configuration views at `/hr/designations` and `/hr/shifts` provide operational controls for workforce scheduling.

## Feature design

**Data model sketch**:

- `Designation`: id, companyId, title, code, description, deletedAt, timestamps
- `Shift`: id, branchId, name, code, startTime, endTime, gracePeriodMinutes, deletedAt, timestamps
- `Employee`: id, userId (nullable), companyId, branchId, departmentId, designationId, shiftId (nullable), employeeNumber (unique per company), firstName, lastName, email, phone, dateOfBirth, gender, joinDate, confirmationDate, status (ACTIVE, PROBATION, SUSPENDED, TERMINATED, RESIGNED), employmentType (FULL_TIME, PART_TIME, CONTRACT, INTERN), baseSalary (integer minor units), bankName, bankAccount, emergencyContact, deletedAt, timestamps
- `EmployeeTransition`: id, employeeId, transitionType, effectiveDate, fromBranchId, toBranchId, fromDepartmentId, toDepartmentId, fromDesignationId, toDesignationId, previousSalary, newSalary, remarks, approvedByUserId, createdAt

**API and Server Action surface**:

| Function                         | Module          | Key inputs                                                   | Key outputs             | Auth requirement         | Key errors                                    |
| -------------------------------- | --------------- | ------------------------------------------------------------ | ----------------------- | ------------------------ | --------------------------------------------- |
| `createDesignationAction`        | `hr-actions.ts` | companyId, title, code, description                          | Result with Designation | SUPER_ADMIN or HR_MANAGE | 400 invalid code, 409 code exists             |
| `updateDesignationAction`        | `hr-actions.ts` | designationId, title, description                            | Result with Designation | SUPER_ADMIN or HR_MANAGE | 404 not found                                 |
| `deleteDesignationAction`        | `hr-actions.ts` | designationId                                                | Result with boolean     | SUPER_ADMIN or HR_MANAGE | 400 active employees assigned                 |
| `createShiftAction`              | `hr-actions.ts` | branchId, name, code, startTime, endTime, gracePeriodMinutes | Result with Shift       | SUPER_ADMIN or HR_MANAGE | 409 code exists in branch                     |
| `updateShiftAction`              | `hr-actions.ts` | shiftId, name, startTime, endTime, gracePeriodMinutes        | Result with Shift       | SUPER_ADMIN or HR_MANAGE | 404 not found                                 |
| `deleteShiftAction`              | `hr-actions.ts` | shiftId                                                      | Result with boolean     | SUPER_ADMIN or HR_MANAGE | 400 active employees assigned                 |
| `createEmployeeAction`           | `hr-actions.ts` | employee data                                                | Result with Employee    | SUPER_ADMIN or HR_MANAGE | 400 invalid input, 409 email or number exists |
| `updateEmployeeAction`           | `hr-actions.ts` | employeeId, update fields                                    | Result with Employee    | SUPER_ADMIN or HR_MANAGE | 404 not found                                 |
| `recordEmployeeTransitionAction` | `hr-actions.ts` | transition data                                              | Result with Transition  | SUPER_ADMIN or HR_MANAGE | 400 invalid transition                        |
| `deleteEmployeeAction`           | `hr-actions.ts` | employeeId                                                   | Result with boolean     | SUPER_ADMIN or HR_MANAGE | 404 not found                                 |

**Value sourcing**:

| Action or display     | Value produced or displayed      | Source                                                                    |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Employee directory    | Staff listings with designations | Query on Employee table filtered by active branchId and deletedAt is null |
| Career timeline       | Sequential transition history    | Query on EmployeeTransition ordered by effectiveDate descending           |
| Base salary display   | Currency formatted amount        | Formatted from baseSalary integer minor units divided by 100              |
| Shift schedule        | Working hours and grace window   | Query on Shift table scoped to branchId                                   |
| Audit before snapshot | State before HR mutation         | Fetched via Prisma transaction prior to mutation                          |

**Key invariants**:

- Every employee must belong to a valid Company, physical Branch, Department, and Designation.
- Base salary must be stored as an integer in minor units (for example cents).
- Soft deleted employees must never appear in active operational lists.
- Cross branch employee queries must enforce branchId isolation.
- Career transitions are append only and cannot be deleted or mutated.

## Build plan

- [x] Step 1: Update Prisma schema with Designation, Shift, Employee, and EmployeeTransition models and apply database migration, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for designations, shifts, employees, and career transitions in [src/lib/validations/hr.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/hr.ts), satisfies **AC-2**, **AC-3**, **AC-4**
- [x] Step 3: Implement HR server actions (Designation CRUD, Shift CRUD, Employee enrollment, Career transitions) with audit logging in [src/actions/hr-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/hr-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Build HR management main view at `/hr` with directory table, status badges, and branch filtering, satisfies **AC-6**
- [x] Step 5: Build employee detailed profile and transition timeline view at `/hr/employees/[id]`, satisfies **AC-7**
- [x] Step 6: Build designation and shift management views at `/hr/designations` and `/hr/shifts`, satisfies **AC-8**
- [x] Step 7: Author integration test suite covering designations, shifts, employee enrollment, branch transfers, and soft deletes in [src/**tests**/hr-core.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/hr-core.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Clean employee records enabling attendance tracking, leave accruals, and payroll processing.
- Immutable transition audit trail provides legal and regulatory employment history.
- Integer minor currency storage eliminates floating point inaccuracies.

**Tradeoffs**:

- Cross branch transfers require updating primary branchId on employee record while preserving historical shift logs.

## Rationale

Full architectural deliberation is recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0006-hr-core-and-employee-lifecycle/rationale.md).
