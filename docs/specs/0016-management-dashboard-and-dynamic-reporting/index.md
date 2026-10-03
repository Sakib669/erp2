# 0016. Management Dashboard and Dynamic Reporting

**Date**: 2026-10-03
**Status**: Completed

## Summary

This specification defines the Management Dashboard and Dynamic Reporting module. It delivers real time executive key performance indicators across branches, including profit and loss metrics, employee headcount, stock inventory valuation, and pending approval bottlenecks. It also introduces a dynamic tabular report generator allowing filtered views and CSV exports.

## Requirements

- **AC-1**: System computes live executive metrics across branches, including total revenue, operating expenses, net profit, active headcount, and inventory valuation.
- **AC-2**: Users can filter executive dashboard views by branch context or inspect consolidated multi branch totals.
- **AC-3**: System generates dynamic tabular reports for Profit and Loss, Payroll Expense, Inventory Valuation, and Attendance Summaries with configurable date ranges.
- **AC-4**: Users can export dynamic reports as standardized comma separated values for spreadsheet analysis.

## Decision

Reporting calculations leverage transactional database queries against existing general ledger entries, payroll runs, employee records, and inventory stock balances without duplicating financial state. Server actions in `src/actions/reporting-actions.ts` return typed data structures ready for interactive visualization and CSV export.

## Build plan

- [x] Step 1: Define Zod validation schemas for reporting queries in `src/lib/validations/reporting.ts`.
- [x] Step 2: Implement server actions for executive KPIs and dynamic reports in `src/actions/reporting-actions.ts`.
- [x] Step 3: Build dynamic report generator UI at `/reports`.
- [x] Step 4: Author integration tests in `src/__tests__/reporting.test.ts`.

## Consequences

**Positive**:

- Provides leadership with instant cross branch visibility into cash flows, inventory balances, and staffing overhead.
- Tabular exports give finance teams immediate data portability without external reporting plugins.
