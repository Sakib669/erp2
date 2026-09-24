# 0004. Identity, Auth and Branch Context

**Date**: 2026-09-24
**Status**: Complete

## Summary

This specification establishes the identity management, two factor authentication lifecycle, and organization administration for our enterprise resource planning system. It delivers complete CRUD capabilities for companies, branches, and hierarchical departments, coupled with secure session branch context switching and two factor device reset workflows. All mutations enforce Zod validation, soft deletion, and transactional audit logging.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0004-identity-auth-and-branch-context/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0004-identity-auth-and-branch-context/verify.md).

## Requirements

**User stories**:

- As an enterprise administrator, I want to manage company details, physical branches, and department hierarchies so that organizational data is structured accurately.
- As a staff member, I want to sign in securely with password and two factor verification so that our enterprise records remain safe from credential theft.
- As an authorized multi branch operator, I want to switch my active branch workspace seamlessly while the server rejects access to unassigned branches.
- As a security officer, I want administrative recovery workflows for lost two factor devices with mandatory audit logging.

**Acceptance criteria**:

- **AC-1**: Two factor authentication enrollment flow generates QR codes, displays manual entry keys, issues backup recovery codes, and verifies initial TOTP tokens.
- **AC-2**: Server actions in [src/actions/org-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/org-actions.ts) provide validated CRUD operations for Company, Branch, and Department entities using Zod schemas.
- **AC-3**: All organizational mutations execute inside `withAuditTransaction` capturing before and after state diffs in `AuditLog`.
- **AC-4**: Deleting branches or departments applies soft deletion by setting `deletedAt` timestamps, preserving historical ledger associations.
- **AC-5**: Branch context switching validates user branch access on the server, sets the `active_branch_id` cookie, and logs `BRANCH_ACCESS_DENIED` security events on unauthorized attempts.
- **AC-6**: Organization administration view at `/org` renders branch cards, headquarters indicators, and modal dialogs for creating and editing branches.
- **AC-7**: Department administration view at `/org/departments` displays hierarchical parent and child departmental trees with branch scoped filtering.
- **AC-8**: Administrator two factor reset server action in [src/actions/auth-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/auth-actions.ts) clears lost device credentials with transactional audit logging.

## Feature design

**API and Server Action surface**:

| Function                   | Module              | Key inputs                                                  | Output                            | Auth and permission required          |
| -------------------------- | ------------------- | ----------------------------------------------------------- | --------------------------------- | ------------------------------------- |
| `createBranchAction`       | `org-actions.ts`    | name, code, timezone, address, phone, email, isHeadquarters | Result with Branch                | SUPER_ADMIN or ORG_MANAGE             |
| `updateBranchAction`       | `org-actions.ts`    | branchId, update fields                                     | Result with Branch                | SUPER_ADMIN or ORG_MANAGE             |
| `deleteBranchAction`       | `org-actions.ts`    | branchId                                                    | Result with boolean               | SUPER_ADMIN or ORG_DELETE             |
| `createDepartmentAction`   | `org-actions.ts`    | branchId, parentId, name, code                              | Result with Department            | SUPER_ADMIN or ORG_MANAGE             |
| `updateDepartmentAction`   | `org-actions.ts`    | departmentId, name, code, parentId                          | Result with Department            | SUPER_ADMIN or ORG_MANAGE             |
| `deleteDepartmentAction`   | `org-actions.ts`    | departmentId                                                | Result with boolean               | SUPER_ADMIN or ORG_DELETE             |
| `setActiveBranchAction`    | `branch-actions.ts` | branchId                                                    | Result with branch info           | Assigned to branch or SUPER_ADMIN     |
| `resetUserTwoFactorAction` | `auth-actions.ts`   | targetUserId, adminReason                                   | Result with boolean               | SUPER_ADMIN with 2FA_RESET permission |
| `setupTwoFactorAction`     | `auth-actions.ts`   | none (uses session)                                         | Secret, QR data URI, backup codes | Authenticated user                    |
| `confirmTwoFactorAction`   | `auth-actions.ts`   | token, secret, backupCodes                                  | Result with success boolean       | Authenticated user                    |

**Value sourcing**:

| Action or display     | Value produced or displayed  | Source                                                          |
| --------------------- | ---------------------------- | --------------------------------------------------------------- |
| Branch list           | Active branch records        | Query on Branch table filtering `deletedAt IS NULL`             |
| Department tree       | Parent and child departments | Query on Department table filtering by active `branchId`        |
| Active branch cookie  | `active_branch_id`           | Set by `setActiveBranchAction` after server authorization check |
| Audit before snapshot | Previous database state      | Fetched via Prisma transaction prior to mutation                |
| Audit after snapshot  | New database state           | Returned by Prisma create or update call                        |
| TOTP QR Code          | Base64 PNG data URL          | Generated via `qrcode` package from `generateURI()`             |

**Key invariants**:

- Every branch must belong to a valid Company.
- A branch code must be unique across the organization.
- A department code must be unique within its branch (`[branchId, code]`).
- Soft deleted branches or departments must never appear in active lists.
- Cross branch access attempts must return 404 and record an audit log entry.
- Only administrators with verified permissions may reset another user's two factor authentication.

## Build plan

- [x] Step 1: Author Zod schemas for organization and branch validation in [src/lib/validations/org.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/org.ts), satisfies **AC-2**
- [x] Step 2: Implement organization server actions (Branch CRUD, Department CRUD) with audit logging in [src/actions/org-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/org-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**
- [x] Step 3: Implement two factor authentication setup, verification, and administrative reset in [src/actions/auth-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/auth-actions.ts), satisfies **AC-1**, **AC-8**
- [x] Step 4: Build organization management page at `/org` with Branch listing, modal dialogs, and headquarters indicator, satisfies **AC-6**
- [x] Step 5: Build department management page at `/org/departments` with hierarchical tree rendering, satisfies **AC-7**
- [x] Step 6: Build two factor security settings view and QR enrollment modal in [src/components/auth/two-factor-setup.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/auth/two-factor-setup.tsx), satisfies **AC-1**
- [x] Step 7: Write integration test suite covering branch CRUD, department hierarchy, branch switching, and 2FA reset in [src/**tests**/identity-branch-context.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/identity-branch-context.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-8**

## Consequences

**Positive**:

- Clean organization hierarchy enabling accurate branch and department cost centers.
- Robust security posture with enforced two factor authentication and audited reset workflows.
- Zero data leakage across physical branch boundaries.
