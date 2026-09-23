# Rationale: 0002. Core multi tenant data model

**Date**: 2026-09-24

## Context

An enterprise management platform coordinates operations across distributed physical branches. When staff members view inventory, employee records, or accounting entries, data must remain strictly isolated within their authorized branch workspace.

Without architectural enforcement at the data access layer, developers must remember to add manual branch filters to every query. A single missing condition leaks sensitive employee or financial records across branches. Furthermore, regulatory compliance requires tamper evident audit history for all entity mutations, while soft delete rules must preserve data integrity without polluting day to day queries.

## Options considered

### Option 1: Extended Prisma client factory (Recommended)

Create a factory helper that wraps the Prisma client with extensions. The extended client automatically binds queries to the active branchId, appends deletedAt null filters to read operations, and provides transaction helpers for audit logging.

**Pros**:

- Direct integration with Prisma queries used in Next.js Server Components and Server Actions.
- Zero boilerplate required in individual domain queries.
- Strong type safety preserved across all generated models.

**Cons**:

- Requires discipline to import the branch scoped client rather than the raw singleton in domain logic.

### Option 2: Application repository abstraction layer

Wrap every entity in custom repository classes or objects that take branch context as a parameter and construct queries manually.

**Pros**:

- Decouples business logic completely from Prisma ORM specifics.

**Cons**:

- Heavy boilerplate to create and maintain repositories for dozens of domain entities.
- Masks native Prisma query capabilities such as relational includes and type inference.

### Option 3: PostgreSQL Row Level Security

Configure PostgreSQL native Row Level Security policies on every table and set session variables before running queries.

**Pros**:

- Database level security that enforces isolation even if raw SQL is executed.

**Cons**:

- Connection pooling with PgBouncer requires careful transaction scoped session variable cleanup.
- More complex local development and migration testing workflows.

## Decision

**Chosen option**: Option 1: Extended Prisma client factory

We will implement an extended Prisma client factory that injects branchId isolation, applies soft delete query filters, and provides transactional audit logging.

Next.js 15 App Router utilizes React Server Components and Server Actions where database calls occur directly on the server. An extended Prisma client provides seamless data isolation directly within Prisma query builders while preserving full type inference and autocomplete.

Wrapping mutations in interactive transactions ensures that audit log entries and domain state changes succeed or fail as atomic units, preventing untracked database mutations.
