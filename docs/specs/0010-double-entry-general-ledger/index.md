# 0010. Double Entry General Ledger

**Date**: 2026-09-29
**Status**: Complete

## Summary

This specification establishes the double entry general ledger, hierarchical chart of accounts, journal vouchers, accounting period locks, and real time balance calculation for our enterprise resource planning system. It enforces mathematical debit credit equilibrium storing all amounts as integer minor units in cents and strictly blocks posting into closed fiscal periods.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0010-double-entry-general-ledger/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0010-double-entry-general-ledger/verify.md).

## Requirements

**User stories**:

- As a financial controller, I want to manage a structured chart of accounts across assets, liabilities, equity, revenues, and expenses.
- As an accountant, I want to record journal vouchers with debit and credit lines and have the system guarantee balanced sums.
- As an auditor, I want accounting periods to be locked so backdated entries cannot alter finalized books.
- As a branch manager, I want journal entries to track branch context so multi branch financial reporting is segregated accurately.
- As a chief financial officer, I want posted entries to update real time account balances and maintain a full audit trail.

**Acceptance criteria**:

- **AC-1**: Database schema models `Account`, `FiscalPeriod`, `JournalEntry`, and `JournalLine` with strict company and branch isolation, integer currency storage, and soft delete timestamps.
- **AC-2**: Server actions in [src/actions/account-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/account-actions.ts) provide validated CRUD operations for chart of accounts.
- **AC-3**: Fiscal period management actions allow creating accounting windows and locking closed periods.
- **AC-4**: Journal voucher creation action `createJournalEntryAction` verifies that total debits exactly equal total credits and rejects unbalanced transactions.
- **AC-5**: Posting action `postJournalEntryAction` verifies that entry date does not fall within a closed fiscal period and adjusts account balances atomically inside `withAuditTransaction`.
- **AC-6**: General ledger views at `/accounts` and `/accounts/journals` render account trees, journal lists, and voucher creation dialogs with dynamic debit and credit balancing lines.
- **AC-7**: Fiscal period management view at `/accounts/periods` provides period lock controls.

## Feature design

**Data model sketch**:

- `Account`: id, companyId, code, name, type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE), balance, description, isReconciled, parentId, deletedAt, timestamps. Unique on `[companyId, code]`.
- `FiscalPeriod`: id, companyId, name, startDate, endDate, isClosed, closedAt, closedByUserId, deletedAt, timestamps. Unique on `[companyId, name]`.
- `JournalEntry`: id, companyId, branchId, entryNumber, entryDate, status (DRAFT, POSTED, CANCELLED), description, reference, totalAmount, postedAt, postedByUserId, deletedAt, timestamps. Unique on `[companyId, entryNumber]`.
- `JournalLine`: id, journalEntryId, accountId, type (DEBIT, CREDIT), amount, memo, createdAt.

**API and Server Action surface**:

| Function                       | Module               | Key inputs                                         | Key outputs                 | Auth requirement               | Key errors                              |
| ------------------------------ | -------------------- | -------------------------------------------------- | --------------------------- | ------------------------------ | --------------------------------------- |
| `createAccountAction`          | `account-actions.ts` | companyId, code, name, type, parentId              | Result with Account         | SUPER_ADMIN or ACCOUNTS_MANAGE | 409 code exists                         |
| `updateAccountAction`          | `account-actions.ts` | accountId, updates                                 | Result with Account         | SUPER_ADMIN or ACCOUNTS_MANAGE | 404 not found                           |
| `deleteAccountAction`          | `account-actions.ts` | accountId                                          | Result with boolean         | SUPER_ADMIN or ACCOUNTS_MANAGE | 400 has postings                        |
| `getAccountsAction`            | `account-actions.ts` | companyId                                          | Result with list            | ACCOUNTS_VIEW                  | 403 unauthorized                        |
| `createFiscalPeriodAction`     | `account-actions.ts` | companyId, name, startDate, endDate                | Result with FiscalPeriod    | SUPER_ADMIN or ACCOUNTS_MANAGE | 409 period exists                       |
| `toggleFiscalPeriodLockAction` | `account-actions.ts` | periodId, isClosed                                 | Result with FiscalPeriod    | SUPER_ADMIN or ACCOUNTS_MANAGE | 404 not found                           |
| `getFiscalPeriodsAction`       | `account-actions.ts` | companyId                                          | Result with list            | ACCOUNTS_VIEW                  | 403 unauthorized                        |
| `createJournalEntryAction`     | `account-actions.ts` | branchId, entryDate, description, reference, lines | Result with JournalEntry    | SUPER_ADMIN or ACCOUNTS_MANAGE | 400 unbalanced lines, 400 closed period |
| `postJournalEntryAction`       | `account-actions.ts` | entryId                                            | Result with JournalEntry    | SUPER_ADMIN or ACCOUNTS_MANAGE | 400 already posted, 400 closed period   |
| `getJournalEntriesAction`      | `account-actions.ts` | branchId, status, fromDate, toDate                 | Result with list            | ACCOUNTS_VIEW                  | 403 unauthorized                        |
| `getJournalEntryDetailsAction` | `account-actions.ts` | entryId                                            | Result with entry and lines | ACCOUNTS_VIEW                  | 404 not found                           |

**Value sourcing**:

| Action or display      | Value produced or displayed                 | Source                                                                                   |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Total voucher amount   | Sum of all debit line amounts               | Calculated from lines array where type is DEBIT                                          |
| Debit credit check     | Difference between total debits and credits | Must equal 0 before creation or posting                                                  |
| Account balance update | Real time balance adjustment                | Debits increase Assets and Expenses. Credits increase Liabilities Equity and Revenue     |
| Period lock validation | Check if entryDate is in closed period      | Query on FiscalPeriod where isClosed is true and entryDate between startDate and endDate |

**Key invariants**:

- Sum of debits must strictly equal sum of credits for any posted journal entry.
- No entries can be posted or edited within a closed fiscal period.
- All currency balances and line amounts are integers in minor units (cents).
- Soft deletion protects accounts with historical journal lines from being deleted.

## Build plan

- [x] Step 1: Add Account, FiscalPeriod, JournalEntry, and JournalLine models and enums to Prisma schema and execute database push, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for chart of accounts, fiscal periods, and journal entries in [src/lib/validations/account.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/account.ts), satisfies **AC-2**, **AC-3**, **AC-4**
- [x] Step 3: Implement ledger server actions and debit credit posting engine in [src/actions/account-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/account-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Build chart of accounts management view at `/accounts`, satisfies **AC-6**
- [x] Step 5: Build journal entries ledger view at `/accounts/journals` and fiscal periods view at `/accounts/periods`, satisfies **AC-6**, **AC-7**
- [x] Step 6: Author integration test suite covering balance equilibrium, period locking, balance updates, and multi branch isolation in [src/**tests**/general-ledger.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/general-ledger.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Double entry enforcement eliminates unbalanced accounting records.
- Fiscal period locks prevent backdated tampering with audited statements.
- Integer arithmetic ensures exact cents precision across corporate financial ledgers.

**Tradeoffs**:

- Strict period locks require formal journal entries in subsequent open periods to make corrections.
