# 0014. Enterprise Approval Workflows

**Date**: 2026-10-01
**Status**: Proposed

## Summary

This specification defines the Enterprise Approval Workflows module. It enables dynamic, multi-tier approval hierarchies for various entities in the ERP (such as Purchase Orders, Leave Requests, and Expenses). The system evaluates conditional rules (e.g. monetary thresholds) and automatically routes approval requests to the appropriate users or roles, supporting automatic delegation when an approver is on leave.

## Requirements

- **AC-1**: Admins can define `ApprovalWorkflow` templates tied to specific entity types (e.g., PURCHASE_ORDER, LEAVE_REQUEST) with sequential steps/rules.
- **AC-2**: System can initialize an `ApprovalRequest` when a relevant entity enters a pending state, determining the required sequence of approvers.
- **AC-3**: Users can view a dashboard of all requests pending their approval across different modules.
- **AC-4**: Users can approve, reject, or request changes on an `ApprovalRequest`, automatically advancing the workflow or terminating it based on the decision.
- **AC-5**: If an assigned approver is currently on an approved leave, the system automatically delegates the approval step to their designated fallback or escalates it to their manager.

## Decision

We will introduce a set of models in Prisma to manage workflows: `ApprovalWorkflow`, `ApprovalStep` (ordered rules), `ApprovalRequest` (instances tied to actual records via `entityType` and `entityId`), and `ApprovalAction` (log of decisions). Actions will automatically hook into HR Leave data to check approver availability for delegation.

## Build plan

- [ ] Step 1: Add `ApprovalWorkflow`, `ApprovalStep`, `ApprovalRequest`, `ApprovalAction`, and `ApprovalDelegation` models to Prisma schema. Run `prisma db push` and `prisma generate`, satisfies **AC-1**, **AC-2**.
- [ ] Step 2: Create Zod validation schemas for creating workflows, submitting requests, and acting on requests, satisfies **AC-1**, **AC-4**.
- [ ] Step 3: Implement server actions in `src/actions/approval-actions.ts` for managing workflows and processing approval transitions (including leave detection), satisfies **AC-2**, **AC-4**, **AC-5**.
- [ ] Step 4: Build a centralized Approval Inbox UI at `/approvals` for users to view and act on pending requests, satisfies **AC-3**.
- [ ] Step 5: Build admin UI at `/admin/workflows` to configure and visualize the approval hierarchies, satisfies **AC-1**.
- [ ] Step 6: Author integration test suite in `src/__tests__/approvals.test.ts` to verify multi-step transitions and delegation logic, satisfies all ACs.

## Consequences

**Positive**:

- Centralized approval logic removes hardcoded approval paths from individual modules (Procurement, Leave, etc.).
- Robust delegation prevents business processes from stalling when key personnel are absent.
- Full traceability for audit and compliance.

**Tradeoffs**:

- Introduces complexity in entity resolution, as `entityId` is a generic string rather than a hard foreign key in Prisma (polymorphic relation).
- Requires careful transaction management to update the parent entity (e.g., changing PO status) once the workflow completes.

## Follow-up

- Add email/push notifications when an approval is requested or completed.
- Support parallel approvals (e.g., requiring 2 out of 3 peers).
