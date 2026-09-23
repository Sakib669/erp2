# 0002. Core multi tenant data model

**Date**: 2026-09-24
**Status**: In Progress

## Summary

This specification establishes the core relational data model and tenant isolation architecture for our enterprise resource planning system. It provides automated branch level data isolation, soft delete filtering, and transactional audit logging using Prisma client extensions and interactive transactions. These foundations protect tenant boundaries across all operational modules.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0002-core-multi-tenant-data-model/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0002-core-multi-tenant-data-model/verify.md).

## Requirements

**User stories**:

- As a branch manager, I want to access data belonging strictly to my assigned branch so that confidential operational records remain private.
- As an auditor, I want every data mutation recorded with before and after snapshots so that compliance history is preserved.
- As a system administrator, I want deleted records preserved with timestamps rather than permanently removed so that accidental deletions can be investigated.

**Acceptance criteria**:

- **AC-1**: The database schema defines the Department model linked to Branch with hierarchical parent relationships and unique branch codes.
- **AC-2**: A Prisma client factory automatically applies active branch filters to queries and validates mutations against authorized branch scopes.
- **AC-3**: A Prisma extension filters out records where deletedAt is set, unless the query explicitly requests deleted records.
- **AC-4**: A transactional audit helper wraps database mutations and writes before and after state snapshots into the AuditLog table.
- **AC-5**: The Setting entity enforces optimistic concurrency control using a version counter, rejecting stale concurrent updates.
- **AC-6**: Attempting to read or mutate records in an unauthorized branch raises a 404 response and logs a security audit entry.

## Feature design

**Data model sketch**:

- `Company`: id (cuid, PK), name (string), code (string, unique), currency (string), timezone (string), deletedAt (datetime, nullable), createdAt, updatedAt.
- `Branch`: id (cuid, PK), companyId (string, FK), name (string), code (string, unique), timezone (string), address (string, nullable), phone (string, nullable), email (string, nullable), isHeadquarters (boolean), deletedAt (datetime, nullable), createdAt, updatedAt.
- `Department`: id (cuid, PK), branchId (string, FK), parentId (string, FK, nullable), name (string), code (string), deletedAt (datetime, nullable), createdAt, updatedAt. Unique on [branchId, code].
- `User`: id (cuid, PK), email (string, unique), name (string), passwordHash (string), twoFactorEnabled (boolean), twoFactorSecret (string, nullable), twoFactorBackupCodes (string array), activeBranchId (string, nullable), status (string), deletedAt (datetime, nullable), createdAt, updatedAt.
- `Role`: id (cuid, PK), name (string), code (string, unique), description (string, nullable), isSystem (boolean), deletedAt (datetime, nullable), createdAt, updatedAt.
- `Permission`: id (cuid, PK), name (string), code (string, unique), module (string), description (string, nullable), createdAt, updatedAt.
- `RolePermission`: id (cuid, PK), roleId (string, FK), permissionId (string, FK), createdAt. Unique on [roleId, permissionId].
- `UserRole`: id (cuid, PK), userId (string, FK), roleId (string, FK), branchId (string, FK, nullable), createdAt. Unique on [userId, roleId, branchId].
- `UserBranch`: id (cuid, PK), userId (string, FK), branchId (string, FK), isDefault (boolean), createdAt. Unique on [userId, branchId].
- `AuditLog`: id (cuid, PK), userId (string, FK, nullable), branchId (string, FK, nullable), action (string), entity (string), entityId (string), before (json, nullable), after (json, nullable), ipAddress (string, nullable), userAgent (string, nullable), createdAt.
- `Setting`: id (cuid, PK), branchId (string, FK, nullable), key (string), value (string), version (integer, default 1), isEncrypted (boolean), createdAt, updatedAt. Unique on [branchId, key].

**State transitions**:

- User status: `ACTIVE` to `SUSPENDED` to `PENDING`

**API surface**:

| Function             | Parameters                                       | Return type          | Auth required                             | Key errors                                    |
| -------------------- | ------------------------------------------------ | -------------------- | ----------------------------------------- | --------------------------------------------- |
| getBranchPrisma      | branchId: string                                 | ExtendedPrismaClient | Authenticated user assigned to branch     | 404 branch not found or unauthorized          |
| withAuditTransaction | context: AuditContext, callback: tx function     | Promise<T>           | Authenticated user                        | 400 validation error, 500 transaction failure |
| softDeleteEntity     | model: string, id: string, context: AuditContext | Promise<boolean>     | Authenticated user with delete permission | 404 record not found, 403 forbidden           |

**Value sourcing**:

| Action                    | Value produced or displayed                 | Source                                                                 |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Branch query isolation    | Filter condition branchId                   | User activeBranchId verified against UserBranch relation               |
| Soft delete filter        | Filter condition deletedAt: null            | Automatically injected by Prisma client extension                      |
| Audit before snapshot     | JSON object of entity state before mutation | Database read immediately prior to mutation in interactive transaction |
| Audit after snapshot      | JSON object of entity state after mutation  | Result returned by Prisma mutation query                               |
| Setting version increment | Next version integer                        | Derived by adding 1 to existing version column in update query         |

**Key invariants**:

- Every domain query on branch scoped tables must contain the authorized branchId.
- A user can never read or write records belonging to a branch they are not assigned to.
- Domain tables must never be hard deleted; deletedAt timestamp marks soft deletion.
- Every state mutation on core entities must produce a matching AuditLog record in the same database transaction.
- Concurrent updates to Setting must fail if the database version differs from the expected version.

**Security model**:

- Global super administrators can access all branches.
- Branch staff members are restricted to branches linked through UserBranch records.
- Cross branch access attempts trigger an audit log event with action `BRANCH_ACCESS_DENIED` and terminate with a 404 error.

**Critical test scenarios**:

- Happy path: A user assigned to Branch A queries departments and receives only Branch A departments, verifying **AC-1** and **AC-2**.
- Soft delete filtering: Soft deleting a department sets deletedAt timestamp and excludes the department from standard lists, verifying **AC-3**.
- Transactional audit log: Updating a setting records an AuditLog entry with before and after state snapshots, verifying **AC-4**.
- Concurrency conflict: Two simultaneous updates to the same setting with the same base version result in the second write being rejected, verifying **AC-5**.
- Unauthorized branch rejection: Accessing an unassigned branch returns 404 and writes a security audit entry, verifying **AC-6**.

## Build plan

- [x] Add Department model to Prisma schema with hierarchical relation and unique branch code, satisfies **AC-1**
- [x] Apply schema migration to PostgreSQL database and regenerate Prisma Client, satisfies **AC-1**
- [x] Create branch scoped Prisma client extension with automated branchId isolation and soft delete query filtering, satisfies **AC-2**, **AC-3**
- [x] Create transactional audit logging helper with automated state diff capture, satisfies **AC-4**
- [x] Implement optimistic concurrency helper with version column checks on Setting model, satisfies **AC-5**
- [x] Implement server action guard verifying branch membership and auditing denied attempts, satisfies **AC-6**

## Consequences

**Positive**:

- Consistent multi tenant data isolation enforced across all database queries.
- Zero manual query filter boilerplate needed for soft delete handling.
- Tamper evident, transactionally guaranteed audit trails for all critical business data.

**Negative and tradeoffs**:

- Prisma extensions add a small abstraction layer over standard Prisma queries.
- Soft deleted records remain in tables, requiring index filtering considerations for high volume tables.

**Neutral**:

- Developers must use the provided branch client helper rather than raw database instances.
