# 0005. RBAC and Permission Enforcement

**Date**: 2026-09-24
**Status**: Complete

## Summary

This specification establishes role based access control, granular permission evaluation, and user role administration for our enterprise resource planning system. It provides immutable system roles, custom role definitions, modular permission matrices, and dual scoped role assignments (global organization wide or physical branch restricted). All administrative mutations enforce Zod validation and transactional audit logging.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0005-rbac-and-permission-enforcement/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0005-rbac-and-permission-enforcement/verify.md).

## Requirements

**User stories**:

- As an enterprise administrator, I want to define custom roles with precise permission matrices so that staff members only access authorized functional areas.
- As an IT security officer, I want immutable system roles protected against accidental modification or deletion so that baseline access controls remain intact.
- As an operations director, I want to grant users roles either globally across all branches or scoped strictly to specific physical branches.
- As an administrator, I want to manage user account lifecycles (suspend accounts, reset passwords, update branch assignments) with full audit accountability.

**Acceptance criteria**:

- **AC-1**: Default system roles (`SUPER_ADMIN`, `BRANCH_MANAGER`, `HR_MANAGER`, `FINANCE_MANAGER`, `EMPLOYEE`) are seeded with predefined permissions and protected by the `isSystem` flag against deletion or code alteration.
- **AC-2**: Granular action permissions structured by module code (`AUTH`, `ORG`, `HR`, `PAYROLL`, `ACCOUNTS`, `INVENTORY`, `WORKFLOW`, `OPERATIONS`) are seeded in the database.
- **AC-3**: Server actions in [src/actions/rbac-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/rbac-actions.ts) provide validated CRUD for custom roles and permission assignment inside `withAuditTransaction`.
- **AC-4**: User role assignment action supports both global scope (`branchId: null`) and branch scoped assignment (`branchId: string`), recording before and after snapshots in `AuditLog`.
- **AC-5**: User administration server actions support toggling account status (`ACTIVE`, `SUSPENDED`), administrative password reset, and branch assignment updates.
- **AC-6**: Permission verification helper `requirePermission` rejects unauthorized callers with descriptive forbidden errors and logs `PERMISSION_DENIED` security events.
- **AC-7**: Role administration interface at `/admin/roles` renders system and custom roles with an interactive permission matrix modal.
- **AC-8**: User administration interface at `/admin/users` displays employee directory records, status badges, branch tags, and assignment dialogs.

## Feature design

**Data model sketch**:

- `Role`: id, name, code (unique), description, isSystem (boolean), deletedAt, timestamps
- `Permission`: id, name, code (unique), module, description, timestamps
- `RolePermission`: id, roleId, permissionId, unique constraint on (roleId, permissionId)
- `UserRole`: id, userId, roleId, branchId (nullable for global scope), unique constraint on (userId, roleId, branchId)
- `UserBranch`: id, userId, branchId, isDefault (boolean), unique constraint on (userId, branchId)
- `User`: status (ACTIVE, SUSPENDED, PENDING), passwordHash, twoFactorEnabled

**API and Server Action surface**:

| Function                   | Module            | Key inputs                               | Key outputs          | Auth requirement           | Key errors                                                   |
| -------------------------- | ----------------- | ---------------------------------------- | -------------------- | -------------------------- | ------------------------------------------------------------ |
| `createRoleAction`         | `rbac-actions.ts` | name, code, description, permissionIds   | Result with Role     | SUPER_ADMIN or ROLE_MANAGE | 400 invalid code, 409 code exists                            |
| `updateRoleAction`         | `rbac-actions.ts` | roleId, name, description, permissionIds | Result with Role     | SUPER_ADMIN or ROLE_MANAGE | 400 system role protected, 404 not found                     |
| `deleteRoleAction`         | `rbac-actions.ts` | roleId                                   | Result with boolean  | SUPER_ADMIN or ROLE_DELETE | 400 system role cannot be deleted, 409 active users assigned |
| `assignUserRoleAction`     | `rbac-actions.ts` | userId, roleId, branchId                 | Result with UserRole | SUPER_ADMIN or USER_MANAGE | 400 invalid branch or user, 409 already assigned             |
| `revokeUserRoleAction`     | `rbac-actions.ts` | userRoleId                               | Result with boolean  | SUPER_ADMIN or USER_MANAGE | 400 cannot revoke last admin, 404 not found                  |
| `updateUserStatusAction`   | `rbac-actions.ts` | userId, status                           | Result with User     | SUPER_ADMIN or USER_MANAGE | 400 cannot suspend self, 404 user not found                  |
| `adminResetPasswordAction` | `rbac-actions.ts` | userId, newPassword                      | Result with boolean  | SUPER_ADMIN                | 400 password complexity, 404 user not found                  |
| `updateUserBranchesAction` | `rbac-actions.ts` | userId, branchIds, defaultBranchId       | Result with boolean  | SUPER_ADMIN or USER_MANAGE | 400 default branch not in list                               |

**Value sourcing**:

| Action or display     | Value produced or displayed       | Source                                                             |
| --------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Role list             | Roles with permission counts      | Query on Role table with rolePermissions count                     |
| Permission matrix     | Permission checkboxes by module   | Query on Permission grouped by module and RolePermission relations |
| User directory        | Staff with role and branch tags   | Query on User with userRoles and userBranches included             |
| Effective permissions | Set of granted permission strings | Merged global roles and active branch scoped roles on User session |
| Audit before snapshot | State before role or user change  | Query inside transaction prior to mutation                         |
| Audit after snapshot  | State after role or user change   | Returned entity from Prisma mutation                               |

**Key invariants**:

- System roles with `isSystem = true` cannot be deleted, renamed, or have their code altered.
- A user must never be able to revoke their own `SUPER_ADMIN` role or suspend their own account.
- A branch scoped role only applies when the session active branch matches `branchId`.
- Global roles where `branchId` is null grant permissions uniformly across all branches.
- Deleting a custom role performs soft deletion by populating `deletedAt`.

**Critical test scenarios**:

- Happy path: Create custom role, attach modular permissions, assign role to user for specific branch, verify user has permissions when branch is active, verifies AC-3, AC-4, AC-6.
- System role protection: Attempting to delete or alter a system role returns an error and aborts transaction, verifies AC-1.
- Cross branch role boundary: User granted branch manager on branch A cannot exercise manager permissions while switched to branch B, verifies AC-4, AC-6.
- Account recovery: Admin resets user password and suspends account, verifying password hash update and transactional audit log, verifies AC-5.

## Build plan

- [x] Step 1: Create seed data script or database seeder for modular permissions and immutable system roles, satisfies **AC-1**, **AC-2**
- [x] Step 2: Define Zod validation schemas for roles, permissions, and user management in [src/lib/validations/rbac.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/rbac.ts), satisfies **AC-3**, **AC-4**, **AC-5**
- [x] Step 3: Implement RBAC server actions (Role CRUD, Permission assignment, User status toggle, Role assignment, Admin password reset) with audit logging in [src/actions/rbac-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/rbac-actions.ts), satisfies **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Add permission check helpers (`hasPermission`, `requireRole`, `hasBranchPermission`) in [src/lib/auth-helpers.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/auth-helpers.ts), satisfies **AC-6**
- [x] Step 5: Build role management administration page and permission matrix editor at `/admin/roles`, satisfies **AC-7**
- [x] Step 6: Build user administration page with directory list, status actions, and assignment dialogs at `/admin/users`, satisfies **AC-8**
- [x] Step 7: Author integration test suite covering system role protection, custom role CRUD, branch scoped authorization, and user account recovery in [src/**tests**/rbac-permissions.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/rbac-permissions.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:

- Precise, auditable access control aligning with principle of least privilege.
- Physical branch security boundaries prevent cross branch data modification.
- Protected system roles ensure administrators cannot inadvertently lock themselves out.

**Tradeoffs**:

- Checking both global and branch scoped role permissions adds evaluation overhead during session resolution, mitigated by indexing user roles on user and branch identifiers.

## Rationale

Full architectural deliberation and alternatives considered are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0005-rbac-and-permission-enforcement/rationale.md).
