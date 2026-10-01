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
| 6   | RBAC and Permission Enforcement             | Slice 2    | done    |
| 7   | HR Core and Employee Lifecycle              | Slice 3    | done    |
| 8   | Biometric Attendance and Ingestion Queue    | Slice 4    | done    |
| 9   | Leave Management Engine                     | Slice 5    | done    |
| 10  | Payroll Calculation Engine                  | Slice 6    | done    |
| 11  | Double Entry General Ledger                 | Slice 7    | done    |
| 12  | Inventory and Warehouse Management          | Slice 8    | done    |
| 13  | Procurement and Supplier Management         | Slice 9    | done    |
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

### 6. RBAC and Permission Enforcement · complete (spec 0005)

Manage roles, permissions, user role assignments, branch access boundaries, and account recovery workflows.
**Done when:** unauthorized branch access returns 404 with an audit entry, and administrators can execute audited two factor reset workflows.

- [x] Design it (spec): /architect rbac and permission enforcement
- [x] Build it: /develop rbac and permission enforcement
  - [x] Permission seeds and immutable system roles
  - [x] RBAC Zod validation schemas
  - [x] RBAC server actions (Role CRUD, UserRole assignment, Account status and recovery)
  - [x] Permission check helpers and audit logging
  - [x] Role management view at /admin/roles
  - [x] User directory and assignment view at /admin/users
- [x] Verify it: /check verify rbac and permission enforcement
- [x] Test it: /test rbac and permission enforcement
      Spec 0005 · code in `src/`

## Slice 3: HR Core and Employee Lifecycle

### 7. HR Core and Employee Lifecycle · complete (spec 0006)

Manage employee profiles, designations, department assignments, shifts, and lifecycle transitions from joining to transfer and resignation.
**Done when:** administrators can create employees, update employment statuses, and track employment history per branch.

- [x] Design it (spec): /architect hr core and employee lifecycle
- [x] Build it: /develop hr core and employee lifecycle
  - [x] Prisma schema additions for Designation, Shift, Employee, and EmployeeTransition
  - [x] HR Zod validation schemas for personal data, shifts, and compensation
  - [x] Server actions for Designation and Shift CRUD with branch validation
  - [x] Employee onboarding action generating unique staff numbers and initial HIRED transition
  - [x] Career transition action logging promotions, branch transfers, and salary revisions
  - [x] Soft delete employee preservation with transactional audit logging
  - [x] Staff directory view at /hr with branch and department filters
  - [x] Detailed employee profile and career timeline view at /hr/employees/[id]
  - [x] Designation and shift operational manager views at /hr/designations and /hr/shifts
- [x] Verify it: /check verify hr core and employee lifecycle
- [x] Test it: /test hr core and employee lifecycle
      Spec 0006 · code in `src/`

## Slice 4: Biometric Attendance and Ingestion Queue

### 8. Biometric Attendance and Ingestion Queue · complete (spec 0007)

Ingest raw biometric punches through an endpoint, deduplicate entries, and process attendance calculation via background queue.
**Done when:** webhook endpoint accepts offline buffered punches, drops duplicate timestamps, and queues shifts for daily attendance calculation.

- [x] Design it (spec): /architect biometric attendance and ingestion queue
- [x] Build it: /develop biometric attendance and ingestion queue
  - [x] Prisma schema additions for RawAttendanceLog and AttendanceRecord
  - [x] Attendance Zod validation schemas for punch ingestion and manual corrections
  - [x] Biometric ingestion route handler at /api/attendance/ingest with duplicate skipping
  - [x] Attendance calculation engine with late arrivals, early exits, and overtime computation
  - [x] Manual attendance adjustment action with transactional audit logging
  - [x] Daily attendance dashboard at /attendance with status indicators and adjustment modal
  - [x] Device punch stream view at /attendance/devices with punch simulator
- [x] Verify it: /check verify biometric attendance and ingestion queue
- [x] Test it: /test biometric attendance and ingestion queue
      Spec 0007 · code in `src/`

## Slice 5: Leave Management Engine

### 9. Leave Management Engine · complete (spec 0008)

Track leave categories, yearly accruals, carry forward rules, leave balances, and leave request submission.
**Done when:** employees can apply for leave, balances adjust automatically upon approval, and negative balances are prevented.

- [x] Design it (spec): /architect leave management engine
- [x] Build it: /develop leave management engine
  - [x] Prisma schema additions for LeaveType, LeaveBalance, and LeaveRequest
  - [x] Leave Zod validation schemas for categories, requests, and approvals
  - [x] Server actions for Leave Category CRUD with usage protection
  - [x] Leave request submission locking pending days and preventing balance deficits
  - [x] Supervisory approval action converting pending to used days with AttendanceRecord sync
  - [x] Rejection and cancellation flows releasing locked days
  - [x] Leave management view at /leave with balance metrics and request dialogs
  - [x] Leave policy configuration view at /leave/types
- [x] Verify it: /check verify leave management engine
- [x] Test it: /test leave management engine
      Spec 0008 · code in `src/`

## Slice 6: Payroll Calculation Engine

### 10. Payroll Calculation Engine · complete (spec 0009)

Define salary structures, components, and process monthly payroll runs in background workers with mid month proration and idempotency.
**Done when:** monthly payroll runs process via background worker, generate payslips, handle joiner proration, and enforce idempotency keys.

- [x] Design it (spec): /architect payroll calculation engine
- [x] Build it: /develop payroll calculation engine
  - [x] Prisma schema additions for SalaryComponent, PayrollRun, Payslip, and PayslipItem
  - [x] Payroll Zod validation schemas for components, execution, and disbursement
  - [x] Server actions for Salary Component CRUD with historical payslip protection
  - [x] Monthly payroll calculation engine with minor unit integer arithmetic
  - [x] Mid month joiner proration calculating active working day ratios
  - [x] Automated deduction of daily wage equivalents for unexcused attendance absences
  - [x] Idempotency key PAYROLL-[branchId]-[year]-[month] duplicate prevention
  - [x] Salary components manager view at /payroll/components
  - [x] Payroll overview view at /payroll and itemized run inspection view at /payroll/runs/[id]
- [x] Verify it: /check verify payroll calculation engine
- [x] Test it: /test payroll calculation engine
      Spec 0009 · code in `src/`

## Slice 7: Double Entry General Ledger

### 11. Double Entry General Ledger · complete (spec 0010)

Manage chart of accounts, journal vouchers, and ledger postings with balanced debit credit validation and accounting period locks.
**Done when:** unbalanced vouchers are rejected, posted journals update account balances, and backdated vouchers in locked periods are rejected.

- [x] Design it (spec): /architect double entry general ledger
- [x] Build it: /develop double entry general ledger
  - [x] Prisma schema additions for Account, FiscalPeriod, JournalEntry, and JournalLine
  - [x] Account Zod validation schemas for chart of accounts, fiscal periods, and journal entries
  - [x] Server actions for Account and Fiscal Period CRUD with closed period protection
  - [x] Balanced debit credit validation engine in createJournalEntryAction
  - [x] Ledger posting action postJournalEntryAction updating real time account balances
  - [x] Chart of accounts manager view at /accounts
  - [x] Journal vouchers ledger view at /accounts/journals and fiscal periods view at /accounts/periods
- [x] Verify it: /check verify double entry general ledger
- [x] Test it: /test double entry general ledger
      Spec 0010 · code in `src/`

## Slice 8: Inventory and Warehouse Management

### 12. Inventory and Warehouse Management · complete (spec 0011)

Track items, branch warehouses, stock ledger movements with FIFO or average valuation, and optimistic concurrency versioning.
**Done when:** stock movements update inventory with atomic row locks, version numbers prevent race conditions, and negative stock is rejected.

- [x] Design it (spec): /architect inventory and warehouse management
- [x] Build it: /develop inventory and warehouse management
  - [x] Prisma schema additions for Warehouse, ItemCategory, Item, StockLevel, and StockMovement
  - [x] Inventory Zod validation schemas for warehouses, categories, items, and movements
  - [x] Server actions for Warehouse, Category, Item CRUD, and stock transactions
  - [x] Atomic concurrency engine with version control and negative stock rejection
  - [x] Inter warehouse atomic transfer action with dual ledger postings
  - [x] Items catalog and stock levels view at /inventory
  - [x] Warehouse locations view at /inventory/warehouses and movements ledger view at /inventory/movements
- [x] Verify it: /check verify inventory and warehouse management
- [x] Test it: /test inventory and warehouse management
      Spec 0011 · code in `src/`

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
