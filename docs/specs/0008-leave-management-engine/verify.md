# Verify: Leave management engine (spec 0008) updated 2026-09-25

Steps derived from spec 0008 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/leave` : renders leave balance summary cards, pending requests queue, and past request history : AC-6
- Click "Apply for Leave" on `/leave` : opens application modal validating dates, category, and available balance : AC-3, AC-6
- Click "Approve" on `/leave` : confirms request approval, adjusts balance to used, and updates attendance records : AC-4, AC-6
- Click "Reject" on `/leave` : opens dialog requiring rejection explanation and restores pending days to balance : AC-5, AC-6
- Visit `/leave/types` : renders leave policy table with annual quotas and carry forward rules : AC-2, AC-7

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- `pnpm run test` : runs test suite passing all leave engine integration tests : AC-1, AC-2, AC-3, AC-4, AC-5
- `pnpm run build` : production build succeeds generating static and dynamic routes for /leave : AC-6, AC-7

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for LeaveType, LeaveBalance, and LeaveRequest
- AC-2 covered by createLeaveTypeAction, updateLeaveTypeAction, deleteLeaveTypeAction
- AC-3 covered by submitLeaveRequestAction with atomic balance checking
- AC-4 covered by approveLeaveRequestAction with AttendanceRecord sync
- AC-5 covered by rejectLeaveRequestAction with pending balance release
- AC-6 covered by leave management view at app/leave/page.tsx and leave-dashboard.tsx
- AC-7 covered by leave configuration view at app/leave/types/page.tsx and leave-type-manager.tsx
