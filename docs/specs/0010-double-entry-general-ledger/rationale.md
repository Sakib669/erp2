# Rationale: Double entry general ledger (spec 0010)

## Context

Enterprise financial integrity demands strict adherence to GAAP and IFRS double entry bookkeeping rules where every debit has an equal and opposite credit and finalized fiscal periods are tamper resistant.

## Decisions

### 1. Mandatory debit credit equality check

- Decision: Reject any journal entry where total debits do not equal total credits down to the exact cent before database insertion.
- Why: Unbalanced transactions corrupt ledger statements and undermine trial balance audits. Strict validation at the server action and transaction boundary prevents out of balance entries.

### 2. Period locking with date boundary enforcement

- Decision: Implement `FiscalPeriod` with an explicit `isClosed` flag. Any transaction attempting to post into a closed period is rejected with a forbidden status.
- Why: Closing a period signals that financial reports have been filed and locked. Backdated modifications must instead be recorded via adjustment journals in the current open period.

### 3. Real time account balance updates via posting engine

- Decision: Posting a journal entry updates the `balance` integer column on affected `Account` records inside the same database transaction.
- Why: Real time balances allow instant trial balance rendering without needing expensive full table aggregation scans across millions of journal lines on every page load.
