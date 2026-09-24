# Rationale: 0005. RBAC and Permission Enforcement

## Context

Enterprise resource planning systems govern sensitive financial, payroll, inventory, and organizational records. Different staff members require distinct operational scopes depending on their job title and physical branch assignments. We require a robust permission model that protects foundational administrative capabilities while empowering administrators to assemble fine grained custom roles and manage staff memberships safely.

## Options considered

### Option 1: Hardcoded enum roles (SUPER_ADMIN, MANAGER, USER)

- Pro: Simple implementation requiring no database queries or join tables.
- Con: Inflexible for enterprise tenants. Cannot support custom job designations, cross department auditors, or regional branch limitations without altering codebase logic and deploying new code.

### Option 2: Pure Attribute Based Access Control (ABAC)

- Pro: Highly dynamic evaluation based on runtime context attributes (request time, client IP, department).
- Con: Overly complex for initial operational requirements. Difficult for business administrators to audit or understand who has access to which modules.

### Option 3 (Chosen): Hybrid RBAC with immutable system roles, custom role definitions, and branch scoping

- Pro: Clear mental model for enterprise users. Built in system roles cannot be damaged by configuration errors. Custom roles provide modular permission assignments. Dual scoping supports both organization wide administrators and branch restricted staff.
- Con: Requires careful indexing and session resolution to combine global and branch specific permissions cleanly.

## Rationale

We selected Option 3 because it matches real world enterprise hierarchy requirements. Multi branch organizations routinely employ central executives who require global access across all branches, alongside local branch managers and clerks whose authority must remain strictly confined to their physical location. Enforcing this through database relations and transactional audit logging gives full compliance traceability.

## References

None. Standard enterprise design patterns applied directly.
