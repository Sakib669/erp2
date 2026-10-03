# 0015. Operations and Branch Services

**Date**: 2026-10-03
**Status**: Completed

## Summary

This specification defines the Operations and Branch Services module. It provides essential operational facilities for each branch, including internal helpdesk tickets, categorized document storage, visitor reception logs, and company vehicle reservations. All operations are strictly branch scoped and multi tenant isolated.

## Requirements

- **AC-1**: Branch staff can submit internal helpdesk tickets with priority, category, and description, and support managers can update ticket status and assignment.
- **AC-2**: Users can upload and catalog branch documents under categories such as policies, legal, contracts, and facilities.
- **AC-3**: Reception desks can check visitors in with name, phone, purpose, host employee, and badge number, and record checkout times.
- **AC-4**: Staff can reserve company vehicles by vehicle model and license plate for specific time windows, preventing conflicting overlapping bookings.
- **AC-5**: Soft deletes are enforced for tickets, documents, and vehicle reservations.

## Decision

We introduce four models in Prisma: `HelpdeskTicket`, `BranchDocument`, `VisitorLog`, and `VehicleReservation`. Each model enforces direct `branchId` and `companyId` foreign keys for tenant isolation. Domain mutations generate audit log entries.

## Build plan

- [x] Step 1: Add operations models to Prisma schema and migrate database.
- [x] Step 2: Define Zod validation schemas in `src/lib/validations/operations.ts`.
- [x] Step 3: Implement server actions in `src/actions/operations-actions.ts`.
- [x] Step 4: Build operations UI views under `/operations`.
- [x] Step 5: Author integration test suite in `src/__tests__/operations.test.ts`.

## Consequences

**Positive**:

- Centralizes day to day branch operational workflows in the ERP without third party SaaS tools.
- Guarantees branch isolation for sensitive visitor data and internal branch documents.
