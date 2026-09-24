# 0007. Biometric Attendance and Ingestion Queue

**Date**: 2026-09-25
**Status**: Complete

## Summary

This specification establishes the biometric attendance ingestion pipeline, deduplication engine, shift calculation algorithms, and daily attendance monitoring for our enterprise resource planning system. It provides an ingestion endpoint for edge devices and buffered offline logs, database level duplicate rejection, automatic shift alignment with grace period calculation, manual supervisory corrections with mandatory audit logging, and branch scoped reporting views.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0007-biometric-attendance-and-ingestion-queue/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0007-biometric-attendance-and-ingestion-queue/verify.md).

## Requirements

**User stories**:

- As an IT or operations technician, I want physical biometric scanners to send punch batches through an authenticated API endpoint that drops duplicates and logs processing status.
- As an HR administrator, I want raw punch events automatically mapped to employee shifts with calculated late arrivals, early departures, and overtime hours.
- As a branch supervisor, I want to review daily attendance sheets filtered by physical branch and department.
- As an HR manager, I want to apply manual attendance adjustments with recorded justifications and audit trails when staff forget to clock in or out.

**Acceptance criteria**:

- **AC-1**: Database schema models `RawAttendanceLog` and `AttendanceRecord` with strict branch isolation, unique deduplication constraints, and soft delete timestamps.
- **AC-2**: Ingestion API endpoint at `/api/attendance/ingest` validates payload authenticity, rejects duplicate biometric punches, and stores raw punch records.
- **AC-3**: Attendance processing engine calculates daily attendance states (PRESENT, LATE, HALF DAY, ABSENT), work durations, late arrival minutes, and overtime minutes against assigned work shifts.
- **AC-4**: Server action `manualAttendanceCorrectionAction` in [src/actions/attendance-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/attendance-actions.ts) allows authorized supervisors to adjust punch times and status inside `withAuditTransaction`.
- **AC-5**: Daily attendance management view at `/attendance` renders summary metrics, date selector, branch filter, and staff attendance tables.
- **AC-6**: Device and raw log viewer at `/attendance/devices` displays raw biometric ingestion stream with processing statuses and manual reprocessing triggers.

## Feature design

**Data model sketch**:

- `RawAttendanceLog`: id, branchId, deviceId, employeeNumber, punchTime, punchType (CHECK IN, CHECK OUT, BREAK OUT, BREAK IN, AUTO), processed, processingError, rawPayload, createdAt. Unique on `[branchId, deviceId, employeeNumber, punchTime]`.
- `AttendanceRecord`: id, employeeId, branchId, date (DateTime UTC midnight), shiftId (nullable), checkIn (DateTime nullable), checkOut (DateTime nullable), totalWorkMinutes, overtimeMinutes, lateMinutes, earlyExitMinutes, status (PRESENT, LATE, HALF DAY, ABSENT, ON LEAVE, HOLIDAY), isManualCorrection, correctionReason, approvedByUserId, deletedAt, timestamps. Unique on `[employeeId, date]`.

**API and Server Action surface**:

| Function or Endpoint                | Module                  | Key inputs                                      | Key outputs                  | Auth requirement                  | Key errors                           |
| ----------------------------------- | ----------------------- | ----------------------------------------------- | ---------------------------- | --------------------------------- | ------------------------------------ |
| `POST /api/attendance/ingest`       | Route Handler           | branchId, deviceId, punches array               | Ingestion result summary     | Bearer API token or branch secret | 401 unauthorized, 400 invalid schema |
| `processRawAttendancePunchesAction` | `attendance-actions.ts` | branchId, date                                  | Processed record count       | SUPER_ADMIN or HR_MANAGE          | 404 branch not found                 |
| `manualAttendanceCorrectionAction`  | `attendance-actions.ts` | attendanceId, checkIn, checkOut, status, reason | Result with AttendanceRecord | SUPER_ADMIN or HR_MANAGE          | 400 reason required, 404 not found   |
| `getDailyAttendanceAction`          | `attendance-actions.ts` | branchId, date, departmentId, status            | Result with records list     | HR_VIEW                           | 403 unauthorized                     |
| `getRawAttendanceLogsAction`        | `attendance-actions.ts` | branchId, date, limit                           | Result with punch logs       | HR_VIEW                           | 403 unauthorized                     |

**Value sourcing**:

| Action or display         | Value produced or displayed          | Source                                                                                |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| Daily attendance records  | Formatted check in, check out, hours | Query on AttendanceRecord joined with Employee and Shift                              |
| Late arrival calculation  | Late minutes count                   | Difference between checkIn time and shift startTime when exceeding gracePeriodMinutes |
| Work duration             | Total work minutes                   | Difference between checkOut and checkIn timestamps                                    |
| Raw punch stream          | Ingested biometric records           | Query on RawAttendanceLog ordered by punchTime descending                             |
| Ingestion duplicate check | Duplicate drop confirmation          | Unique database constraint on RawAttendanceLog                                        |

**Key invariants**:

- Raw punch deduplication must be enforced at the database level by unique compound index.
- Every attendance record belongs to an active employee and enforces branchId isolation.
- Manual attendance corrections must record before and after states in AuditLog with a mandatory text reason.
- Timestamps are stored in UTC, and daily date boundaries are calculated using the branch operational timezone.

## Build plan

- [x] Step 1: Add RawAttendanceLog and AttendanceRecord models and enums to Prisma schema and execute database push, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for punch ingestion, attendance queries, and manual corrections in [src/lib/validations/attendance.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/attendance.ts), satisfies **AC-2**, **AC-4**
- [x] Step 3: Implement punch processing algorithms and server actions in [src/actions/attendance-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/attendance-actions.ts), satisfies **AC-3**, **AC-4**
- [x] Step 4: Implement biometric ingestion route handler at `src/app/api/attendance/ingest/route.ts`, satisfies **AC-2**
- [x] Step 5: Build daily attendance dashboard view at `/attendance` with summary metrics and correction modal, satisfies **AC-5**
- [x] Step 6: Build device punch stream view at `/attendance/devices`, satisfies **AC-6**
- [x] Step 7: Author integration test suite covering deduplication, shift calculation, late thresholds, and manual corrections in [src/**tests**/attendance.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/attendance.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**

## Consequences

**Positive**:

- Automated attendance tracking reduces payroll discrepancy disputes.
- Robust deduplication prevents double clocks from noisy biometric hardware.
- Immutable raw punch logs provide an audit trail for regulatory compliance.

**Tradeoffs**:

- Cross midnight night shifts require associating early morning check outs with the previous calendar day shift cycle.
