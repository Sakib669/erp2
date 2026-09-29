# Rationale: Leave Management Engine

## Context

Managing time off across multi branch organizations requires accurate balance tracking, proactive conflict prevention, and synchronization with daily biometric attendance.

## Decisions

### 1. Two-phase balance locking (Pending vs Used)

When an employee submits a leave request, the days count is immediately locked into `pendingDays`.

- Rationale: Prevents employees from submitting multiple concurrent requests that together exceed their entitled annual quota.

### 2. Automatic synchronization to daily attendance records

When a leave request transitions to `APPROVED`, the system writes or updates `AttendanceRecord` entries for every working day in the range with status `ON_LEAVE`.

- Rationale: Without this synchronization, the biometric calculation engine would falsely mark employees as `ABSENT` on days when they are on authorized leave.

### 3. Mandatory rejection reasons

Every rejection requires an explicit explanation recorded transactionally in `AuditLog`.

- Rationale: Protects organizations against unfair labor disputes and provides clear feedback to employees regarding policy constraints.
