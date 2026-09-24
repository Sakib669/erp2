# Rationale: 0004. Identity, Auth and Branch Context

**Date**: 2026-09-24

## Context

Enterprise management platforms require strict boundary controls between regional offices and operational divisions. When an employee signs in, their identity must be verified through multi factor authentication, and their data scope must be immediately pinned to authorized physical branches.

Without central organization CRUD and branch context management, users can inadvertently access or overwrite data from other facilities. Furthermore, when physical authentication tokens or mobile authenticator apps are lost or replaced, an audited administrative reset workflow must exist to restore access without compromising security audit integrity.

## Options considered

### Option 1: Cookie backed active branch context with server action verification (Recommended)

Store the active branch identifier in a secure client cookie, validate branch membership inside Server Actions and Route Handlers, and execute all company, branch, and department mutations through interactive database transactions with audit snapshots.

**Pros**:

- Full compatibility with Next.js 15 App Router Server Components without hydration flicker.
- Centralized authorization guards prevent tampering with client cookies.
- Transactional audit records preserve before and after state diffs for regulatory compliance.

**Cons**:

- Requires explicit verification on every server action call.

### Option 2: URL path prefixed branch scoping

Prefix every route in the application with the branch code, for example `/branch-na/hr`.

**Pros**:

- Route URL indicates branch explicitly.

**Cons**:

- Clutters URLs and complicates cross branch reporting or enterprise wide overview dashboards.
- Does not replace server side authorization checks.

## Decision

**Chosen option**: Option 1: Cookie backed active branch context with server action verification

We will implement Option 1 using server validated cookies, Zod schema validation, and transactional audit trails.
