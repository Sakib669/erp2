# Scope: Enterprise Resource Planning System

A multi branch enterprise management system for handling identity, human resources, attendance, payroll, accounting, inventory, and operations.

**Build approach:** Tracer Bullet (build vertical slices end to end through database, logic, server actions, and UI).
**Workflow:** GA (after develop, run check verify, test, review, and document). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                                     | Phase      | Status  |
| --- | ------------------------------------------- | ---------- | ------- |
| 1   | Stack and architecture                      | Foundation | done    |
| 2   | Coding standards and tooling                | Foundation | done    |
| 3   | Core multi tenant data model                | Foundation | done    |
| 4   | Design system and UI foundation             | Foundation | done    |
| 5   | Identity, Auth and Branch Context           | Slice 1    | done    |
| 6   | RBAC and Permission Enforcement             | Slice 2    | planned |
| 7   | HR Core and Employee Lifecycle              | Slice 3    | planned |
| 8   | Biometric Attendance and Ingestion Queue    | Slice 4    | planned |
| 9   | Leave Management Engine                     | Slice 5    | planned |
| 10  | Payroll Calculation Engine                  | Slice 6    | planned |
| 11  | Double Entry General Ledger                 | Slice 7    | planned |
| 12  | Inventory and Warehouse Management          | Slice 8    | planned |
| 13  | Procurement and Supplier Management         | Slice 9    | planned |
| 14  | Fixed Asset Management                      | Slice 10   | planned |
| 15  | Enterprise Approval Workflows               | Slice 11   | planned |
| 16  | Operations and Branch Services              | Slice 12   | planned |
| 17  | Management Dashboard and Dynamic Reporting  | Slice 13   | planned |
| 18  | Security Hardening and Automated Operations | Slice 14   | planned |

## Foundations

### 1. Stack and architecture · in-progress · assumed decision (spec 0001)

Decide the framework, database engine, runtime libraries, and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the architecture spec records the stack decisions, and the empty scaffold boots locally and passes build.

- [ ] Decide the stack (spec): /architect stack and architecture
- [x] Scaffold from the decision: /develop stack and architecture
- [ ] Smoke check it runs: /test
      Spec 0001 · code in `./`

### 2. Coding standards and tooling · done

Capture conventions, then install linting, formatting, and strict validation from the real scaffolded project.
**Done when:** root AGENTS.md reflects the real stack, and linting plus type checks pass cleanly.

- [x] Capture conventions and tooling choices: /audit
- [x] Install the tooling: /develop tooling
- [x] Check it runs clean: /test

### 3. Core multi tenant data model · complete

Core database schema supporting companies, branches, departments, users, audit logs, and settings with tenant isolation and soft deletes.
**Done when:** the database schema enforces branch isolation, soft delete timestamps, and audit log tracking for all mutations.

- [x] Design it (spec): /architect core multi tenant data model
- [x] Build it: /develop core multi tenant data model
  - [x] Schema update: Department model, Setting version column, and Prisma client generation
  - [x] Extended Prisma client: branchId isolation and automatic soft delete filters
  - [x] Audit & guard helpers: transactional audit state diffs and branch access 404 security checks
- [x] Verify it: /check verify core multi tenant data model
- [x] Test it: /test core multi tenant data model
      Spec 0002 · code in `src/`

### 4. Design system and UI foundation · complete (spec 0003)

Visual theme, responsive layout shells, navigation bars, and accessible form primitives so the application feels cohesive.
**Done when:** design guidelines cover typography, palette, spacing, and base components support full keyboard navigation.

- [x] Design it (spec): /architect design system and UI foundation
- [x] Build it: /develop design system and UI foundation
  - [x] OKLCH color theme, next-themes provider, and Geist typography
  - [x] Core shadcn component primitives (Dialog, DropdownMenu, Table, Select, Tabs, Sheet, Tooltip, Skeleton, Sonner)
  - [x] Enterprise application shell layout with collapsible sidebar and mobile drawer
  - [x] Top navigation bar with branch switcher trigger, search, and user profile
  - [x] Comprehensive design guidelines published to root design.md
- [x] Verify it: /check verify design system and UI foundation
- [x] Test it: /test design system and UI foundation
      Spec 0003 · code in `src/`

## Slice 1: Identity, Auth and Branch Context

### 5. Identity, Auth and Branch Context · complete (spec 0004)

Authenticate users with credentials and two factor verification, store active branch in server validated cookies, and manage branch records.
**Done when:** a user can sign in with two factor authentication, select an authorized branch, and view branch details.

- [x] Design it (spec): /architect identity auth and branch context
- [x] Build it: /develop identity auth and branch context
  - [x] Organization and branch validation schemas in Zod
  - [x] Organization server actions (Branch and Department CRUD) with audit logging
  - [x] Two factor authentication setup, enrollment, and administrative reset actions
  - [x] Organization management view at /org with branch modals
  - [x] Department hierarchy management view at /org/departments
- [x] Verify it: /check verify identity auth and branch context
- [x] Test it: /test identity auth and branch context
      Spec 0004 · code in `src/`

## Slice 2: RBAC and Permission Enforcement

### 6. RBAC and Permission Enforcement · needs a decision

Manage roles, permissions, user role assignments, branch access boundaries, and account recovery workflows.
**Done when:** unauthorized branch access returns 404 with an audit entry, and administrators can execute audited two factor reset workflows.

- [ ] Design it (spec): /architect rbac and permission enforcement

## Slice 3: HR Core and Employee Lifecycle

### 7. HR Core and Employee Lifecycle · needs a decision

Manage employee profiles, designations, department assignments, shifts, and lifecycle transitions from joining to transfer and resignation.
**Done when:** administrators can create employees, update employment statuses, and track employment history per branch.

- [ ] Design it (spec): /architect hr core and employee lifecycle

## Slice 4: Biometric Attendance and Ingestion Queue

### 8. Biometric Attendance and Ingestion Queue · needs a decision

Ingest raw biometric punches through an endpoint, deduplicate entries, and process attendance calculation via background queue.
**Done when:** webhook endpoint accepts offline buffered punches, drops duplicate timestamps, and queues shifts for daily attendance calculation.

- [ ] Design it (spec): /architect biometric attendance and ingestion queue

## Slice 5: Leave Management Engine

### 9. Leave Management Engine · needs a decision

Track leave categories, yearly accruals, carry forward rules, leave balances, and leave request submission.
**Done when:** employees can apply for leave, balances adjust automatically upon approval, and negative balances are prevented.

- [ ] Design it (spec): /architect leave management engine

## Slice 6: Payroll Calculation Engine

### 10. Payroll Calculation Engine · needs a decision

Define salary structures, components, and process monthly payroll runs in background workers with mid month proration and idempotency.
**Done when:** monthly payroll runs process via background worker, generate payslips, handle joiner proration, and enforce idempotency keys.

- [ ] Design it (spec): /architect payroll calculation engine

## Slice 7: Double Entry General Ledger

### 11. Double Entry General Ledger · needs a decision

Manage chart of accounts, journal vouchers, and ledger postings with balanced debit credit validation and accounting period locks.
**Done when:** unbalanced vouchers are rejected, posted journals update account balances, and backdated vouchers in locked periods are rejected.

- [ ] Design it (spec): /architect double entry general ledger

## Slice 8: Inventory and Warehouse Management

### 12. Inventory and Warehouse Management · needs a decision

Track items, branch warehouses, stock ledger movements with FIFO or average valuation, and optimistic concurrency versioning.
**Done when:** stock movements update inventory with atomic row locks, version numbers prevent race conditions, and negative stock is rejected.

- [ ] Design it (spec): /architect inventory and warehouse management

## Slice 9: Procurement and Supplier Management

### 13. Procurement and Supplier Management · needs a decision

Manage vendors, purchase orders, goods received notes, and supplier invoice generation with three way matching.
**Done when:** purchase orders receive goods, quantities update stock ledger automatically, and matching invoices generate ledger entries.

- [ ] Design it (spec): /architect procurement and supplier management

## Slice 10: Fixed Asset Management

### 14. Fixed Asset Management · needs a decision

Register company assets, track branch assignments, and calculate periodic depreciation schedules.
**Done when:** assets track depreciation calculations, ledger reflects asset write downs, and disposals record gain or loss.

- [ ] Design it (spec): /architect fixed asset management

## Slice 11: Enterprise Approval Workflows

### 15. Enterprise Approval Workflows · needs a decision

Configurable multi tier approval hierarchies with conditional rules and automatic delegation when designated approvers are on leave.
**Done when:** approval requests route through configured approval chains, evaluate condition limits, and auto delegate absent approvers.

- [ ] Design it (spec): /architect enterprise approval workflows

## Slice 12: Operations and Branch Services

### 16. Operations and Branch Services · needs a decision

Provide branch operational support including internal helpdesk tickets, document storage, visitor logs, and vehicle reservations.
**Done when:** branch staff can file support tickets, upload categorized documents, log visitors, and schedule company vehicles.

- [ ] Design it (spec): /architect operations and branch services

## Slice 13: Management Dashboard and Dynamic Reporting

### 17. Management Dashboard and Dynamic Reporting · needs a decision

Deliver real time executive metrics on profit and loss, payroll headcount, and stock valuation with custom report generation.
**Done when:** dashboards display cross branch performance indicators and users can filter and export custom tabular reports.

- [ ] Design it (spec): /architect management dashboard and dynamic reporting

## Slice 14: Security Hardening and Automated Operations

### 18. Security Hardening and Automated Operations · needs a decision

Configure rate limiting, strict Content Security Policy headers, and automated database backup routines.
**Done when:** public endpoints enforce rate limits, browser requests pass security headers, and scheduled database backups execute reliably.

- [ ] Design it (spec): /architect security hardening and automated operations

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Mobile companion app**: native mobile application for field attendance and remote approvals · needs a decision
- **Multi currency exchange tracking**: automated daily exchange rate sync across international branches · needs a decision
- **Direct bank settlement**: direct bank wire transfer integration for batch payroll disbursement · needs a decision
- **Automated receipt scanning**: optical character recognition for vendor invoice receipts · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack and architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State                        | Set by                                                                             | The feature shows                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planned` · needs a decision | `/scope`                                                                           | one box: `Design it (spec): /architect <feature>`                                                                                                                                                                                             |
| `in-progress` (designed)     | `/architect` at spec capture                                                       | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled                            |
| `in-progress` (building)     | `/develop`                                                                         | milestone sub boxes tick one by one; code pointer filled                                                                                                                                                                                      |
| `in-progress` (verified)     | `/check verify`                                                                    | `Build it` + milestones ticked; `Verify it` ticked                                                                                                                                                                                            |
| `done`                       | you, when you decide it is (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier last stage (`Prototype` to after `/develop`; `Alpha` to after `/check verify`; `Beta`/`GA` to after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards and tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` to `in-progress` to `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature rigor above or below the project default; no tag inherits the default. It decides the feature check boxes and each skill next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop own build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
