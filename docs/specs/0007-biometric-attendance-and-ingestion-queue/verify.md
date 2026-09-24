# Verify: Biometric attendance and ingestion queue (spec 0007) updated 2026-09-25

Steps derived from spec 0007 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/attendance` : renders daily attendance table with shift hours, check in, check out, late minutes, and status badges : AC-5
- Change date or branch on `/attendance` : filters daily attendance records scoped to the branch : AC-5
- Click "Adjust Attendance" on `/attendance` : opens correction dialog requiring reason and saves adjustment to audit log : AC-4
- Visit `/attendance/devices` : renders raw biometric ingestion stream with device identifiers and punch timestamps : AC-6
- Post payload to `/api/attendance/ingest` : ingests raw punches, rejects duplicate timestamps, and processes shifts : AC-2, AC-3

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run test` : runs test suite passing all attendance integration tests : AC-1, AC-2, AC-3, AC-4
- `pnpm run build` : production build succeeds generating static and dynamic routes for /attendance : AC-5, AC-6

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for RawAttendanceLog and AttendanceRecord
- AC-2 covered by POST /api/attendance/ingest route handler with duplicate rejection
- AC-3 covered by processRawAttendancePunchesAction with shift calculation algorithms
- AC-4 covered by manualAttendanceCorrectionAction with withAuditTransaction
- AC-5 covered by attendance dashboard view at app/attendance/page.tsx and attendance-dashboard.tsx
- AC-6 covered by device logs view at app/attendance/devices/page.tsx and device-manager.tsx
