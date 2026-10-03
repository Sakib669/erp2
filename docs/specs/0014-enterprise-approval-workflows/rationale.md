# Rationale: Enterprise Approval Workflows

## Why polymorphic relationships?

In a strictly typed schema, linking an `ApprovalRequest` to its source entity often involves either multiple nullable foreign keys (`purchaseOrderId`, `leaveRequestId`) or completely separate approval tables per domain. In our Tracer Bullet approach, a unified `ApprovalRequest` table with a polymorphic `entityType` (enum) and `entityId` (string) allows a single global inbox (`/approvals`) to cleanly query pending actions across all modules without complex JOIN logic.

## Why automatic delegation?

Enterprise workflows frequently stall when a manager is unexpectedly absent. By hooking our approval routing engine into the existing `LeaveRequest` module, we can proactively detect if a designated approver is on leave and instantly route the request to their configured fallback, preserving SLAs.

## Why abstract workflow engines?

Hardcoding "If PO amount > 1000 then require Director approval" inside `procurement-actions.ts` breaks down at scale when organizations need flexible, role-based thresholds that change without code deployments. An abstracted `ApprovalWorkflow` engine pushes this logic into data, allowing administrators to reshape approval policies through the UI.
