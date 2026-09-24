# Rationale: Biometric Attendance and Ingestion Queue

## Context

Physical access control terminals and fingerprint scanners periodically flush punch logs across intermittent network connections. Duplicate punches occur frequently when employees repeatedly tap cards or hold their finger on the sensor.

## Decisions

### 1. Ingestion endpoint vs direct database connection

We expose an HTTP ingestion endpoint `/api/attendance/ingest` rather than allowing physical devices or middleware to connect directly to the PostgreSQL database.

- Rationale: Limits database connection exposure, allows API key validation, and permits schema validation before writes.

### 2. Compound unique constraint for deduplication

We place a unique compound constraint on `[branchId, deviceId, employeeNumber, punchTime]` in `RawAttendanceLog`.

- Rationale: Hardware sensors often buffer and resend identical events multiple times during re-connection. The database constraint guarantees idempotency even under concurrent ingestion batches.

### 3. Separation of raw punch logs from calculated attendance records

We maintain `RawAttendanceLog` as an append only record of physical hardware inputs and `AttendanceRecord` as the synthesized daily attendance outcome.

- Rationale: Raw sensor data remains immutable for dispute resolution. If shift schedules or grace periods are recalculated, the raw logs remain untouched.

### 4. Mandatory justification on manual adjustments

Any manual correction requires a non empty justification and runs inside `withAuditTransaction`.

- Rationale: Labor laws and internal controls require full transparency when an administrator edits punch times.
