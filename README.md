# Enterprise Resource Planning System

A multi branch enterprise management platform built for organizations coordinating human resources, biometric attendance, payroll, double entry accounting, inventory, procurement, asset depreciation, approval workflows, and branch operations.

Built with Next.js 15 App Router, React Server Components, TypeScript 5, PostgreSQL, Prisma ORM, Auth.js, and Tailwind CSS.

---

## Architecture and Core Principles

The platform follows a tracer bullet architecture, implementing every module vertically through the database schema, business domain logic, transactional audit trails, server actions, and accessible user interfaces.

- **Multi Branch Data Isolation**: Every company query and mutation strictly enforces physical branch boundaries through `branchId` scoping.
- **Audit Trail Engine**: Mutations and authorization security events record transactional diffs in the database `AuditLog` table.
- **Soft Delete Lifecycle**: Domain records preserve history using `deletedAt` timestamps. Physical database records are never hard deleted.
- **Financial Integrity**: Monetary values are stored as integers in minor currency units (cents) to avoid floating point calculation errors.
- **Security Hardening**: Strict Content Security Policy headers, HTTP Strict Transport Security, sliding window rate limiters, and TOTP two factor authentication.

---

## Technology Stack

| Layer              | Technology                 | Details                                                       |
| ------------------ | -------------------------- | ------------------------------------------------------------- |
| Framework          | Next.js 15                 | App Router, React 19.3, Server Actions, Turbopack             |
| Language & Runtime | TypeScript 5.9, Node.js 24 | Strict type checking, Node types 26 without emit errors       |
| Database           | PostgreSQL 16              | Relational persistence with foreign keys and compound indexes |
| ORM                | Prisma ORM 6 (v6.19)       | Schema migrations, typed queries, and transactional clients   |
| Authentication     | Auth.js (NextAuth v5 beta) | Credentials provider, JWT sessions, and TOTP pairing          |
| Styling & UI       | Tailwind CSS 4, shadcn ui  | Accessible OKLCH color palettes and Radix UI primitives       |
| Icons              | Lucide React (v1.51)       | Clean, consistent enterprise icon set                         |
| Testing            | Vitest (v5.0.3)            | 17 test suites covering 170 unit and integration tests        |
| Package Manager    | pnpm                       | Fast, deterministic dependency management                     |

---

## Completed Feature Modules

The platform includes all 18 planned modules across 4 foundations and 14 vertical domain slices:

### 1. Foundations

- **Stack & Architecture**: Modern Next.js App Router scaffold with Turbopack compilation and PostgreSQL persistence.
- **Coding Standards & Tooling**: ESLint, Prettier, strict TypeScript configs, and automated pre commit hooks.
- **Core Multi Tenant Data Model**: Hierarchical department trees, multi branch associations, and isolated tenant queries.
- **Design System & UI Foundation**: WCAG 2.1 AA accessible OKLCH color system, collapsible responsive sidebar, branch context switcher, and high density data tables.

### 2. Identity and Access Control

- **Identity, Auth and Branch Context (Slice 1)**: Secure login, TOTP authenticator app pairing with QR code generation, backup recovery codes, and active branch context switching.
- **Role Based Access Control (Slice 2)**: 21 granular permissions, 5 immutable system roles, custom role builder with permission matrices, and unauthorized access auditing.

### 3. Workforce Management

- **HR Core and Employee Lifecycle (Slice 3)**: Employee profiles, job designations, shift assignments, and career transition tracking covering promotions, transfers, and terminations.
- **Biometric Attendance and Ingestion (Slice 4)**: Webhook punch stream endpoint, deduplication queue, late arrival and overtime calculations, and punch simulators.
- **Leave Management Engine (Slice 5)**: Leave categories, annual accruals, carry forward rules, balance locking, and automated synchronization with daily attendance.
- **Payroll Calculation Engine (Slice 6)**: Monthly salary runs, earning and deduction components, mid month joiner proration, unexcused absence penalties, and unique idempotency keys.

### 4. Financials and Supply Chain

- **Double Entry General Ledger (Slice 7)**: Multi currency chart of accounts, balanced debit credit journal vouchers, real time ledger postings, and fiscal period locks.
- **Inventory and Warehouse Management (Slice 8)**: Multi warehouse tracking, SKU catalog, atomic inter warehouse transfers, and negative inventory prevention.
- **Procurement and Supplier Management (Slice 9)**: Supplier directory, purchase orders, goods received notes, and automated three way invoice matching.
- **Fixed Asset Management (Slice 10)**: Asset registry, straight line depreciation scheduling, branch transfers, and disposal gain or loss accounting.

### 5. Governance and Operations

- **Enterprise Approval Workflows (Slice 11)**: Configurable multi tier approval hierarchies, conditional thresholds, and delegation fallbacks.
- **Operations and Branch Services (Slice 12)**: Internal helpdesk ticketing with sequential IDs, branch document archive, visitor logs, and vehicle reservations.
- **Management Dashboard and Dynamic Reporting (Slice 13)**: Executive KPIs for revenue, expenses, payroll burden, inventory valuation, and tabular report builder with CSV exports.
- **Security Hardening and Automated Operations (Slice 14)**: Sliding window rate limiting, security headers, SHA256 verified database backup snapshots, and posture tracking.

---

## Application Route Map

| Route                    | Access Level | Description                                                           |
| ------------------------ | ------------ | --------------------------------------------------------------------- |
| `/login`                 | Public       | Credentials sign in with optional two factor authentication code      |
| `/`                      | Protected    | Executive dashboard with branch overview and financial summary        |
| `/org`                   | Protected    | Branch office directory, headquarters flag, and address records       |
| `/org/departments`       | Protected    | Hierarchical organizational units with parent and child relationships |
| `/admin/users`           | Protected    | Staff accounts, branch assignments, and role bindings                 |
| `/admin/roles`           | Protected    | System roles and custom role permission matrices                      |
| `/hr`                    | Protected    | Employee directory with department and branch filters                 |
| `/hr/employees/[id]`     | Protected    | Staff profile, compensation history, and career transitions           |
| `/attendance`            | Protected    | Daily attendance roll, work durations, and manual corrections         |
| `/attendance/devices`    | Protected    | Biometric punch event stream and device ingestion simulator           |
| `/leave`                 | Protected    | Employee leave balance requests and supervisory approvals             |
| `/leave/types`           | Protected    | Company leave categories and carry forward policies                   |
| `/payroll`               | Protected    | Monthly payroll runs, disbursement statuses, and payslips             |
| `/payroll/components`    | Protected    | Earning and deduction components with calculation formulas            |
| `/accounts`              | Protected    | Double entry chart of accounts and balance ledgers                    |
| `/accounts/journals`     | Protected    | Balanced journal vouchers with itemized debit and credit lines        |
| `/accounts/periods`      | Protected    | Fiscal period locks preventing retroactive adjustments                |
| `/inventory`             | Protected    | Item catalog, unit costs, pricing, and current stock levels           |
| `/inventory/warehouses`  | Protected    | Physical warehouse locations assigned to branches                     |
| `/inventory/movements`   | Protected    | Inbound, outbound, and inter warehouse transfer history               |
| `/procurement`           | Protected    | Purchase orders, supplier invoices, and receipts overview             |
| `/procurement/suppliers` | Protected    | Approved vendor directory and payment term profiles                   |
| `/assets`                | Protected    | Fixed asset registry, net book valuation, and depreciation            |
| `/operations`            | Protected    | Branch helpdesk tickets, vehicle reservations, and visitor logs       |
| `/reports`               | Protected    | Dynamic business reports with metric filters and CSV export           |
| `/workflows`             | Protected    | Approval workflow definitions and pending authorization queue         |
| `/settings`              | Protected    | Two factor security pairing, system backups, and profile info         |
| `/admin/security`        | Protected    | Rate limit status, security posture, and database backup controls     |

---

## Getting Started

### Prerequisites

- Node.js 24 or later
- pnpm (`npm install -g pnpm`)
- PostgreSQL 16 database instance

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Sakib669/erp2.git
cd erp2
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/erp2?schema=public"

# Auth.js secret key (minimum 32 characters)
AUTH_SECRET="dev-insecure-secret-key-must-be-changed-in-production-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Application Environment
NODE_ENV="development"
```

### 3. Database Initialization

Generate Prisma client files and push the database schema:

```bash
pnpm prisma generate
pnpm prisma db push
```

### 4. Running the Development Server

Start the Next.js development server with Turbopack:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Quality and Verification Commands

The project includes an automated test suite and strict type checking:

```bash
# Run all 17 integration test suites (170 tests)
pnpm test

# Run static TypeScript type check
pnpm exec tsc --noEmit

# Run ESLint validation
pnpm run lint

# Compile production build
pnpm run build
```

---

## License

Enterprise Resource Planning System source code is maintained for internal organization operations and deployment.
