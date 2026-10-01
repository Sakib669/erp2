# 0013. Fixed Asset Management

**Date**: 2026-10-01
**Status**: Completed

## Summary

This specification defines the Fixed Asset Management module, enabling the business to register assets, track their physical branch assignments, calculate and record periodic depreciation, and process asset disposals. It tightly integrates with the double-entry general ledger to ensure depreciation expenses and asset write-downs are accurately reflected in the financial statements.

## Requirements

- **AC-1**: Users can register a new fixed asset with purchase cost, salvage value, useful life, and depreciation method (Straight Line).
- **AC-2**: Users can view a paginated, branch-scoped list of fixed assets and their current book values.
- **AC-3**: System calculates depreciation for a given period and atomically creates a `JournalEntry` (debit Depreciation Expense, credit Accumulated Depreciation) and an `AssetDepreciation` record.
- **AC-4**: Users can dispose of an asset (sell or write-off), which updates the asset status to DISPOSED and generates a `JournalEntry` realizing any gain or loss on disposal.
- **AC-5**: Soft deletes are enforced for assets that have not yet had depreciation posted against them.

## Decision

The fixed asset tracking will reside within the core Prisma schema using a `FixedAsset` model and a related `AssetDepreciation` model to record historical depreciation events. Depreciation runs will compute the straight-line reduction and automatically post to the general ledger.

**Implementation skills**: `default` (Next.js server actions, Zod schemas, Prisma).

## Feature design

**Data model sketch**:

| Entity              | Fields                                                                                                                                                                                                                       | Constraints / Notes             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `FixedAsset`        | id, companyId, branchId, assetCode, name, description, category, purchaseDate, purchaseCost (Int), currentBookValue (Int), usefulLifeYears (Int), salvageValue (Int), status (Enum: ACTIVE, DISPOSED), deletedAt, timestamps | Unique `[companyId, assetCode]` |
| `AssetDepreciation` | id, assetId, journalEntryId, periodEndDate, depreciationAmount (Int), bookValueAfter (Int), createdAt                                                                                                                        | FK `assetId`, `journalEntryId`  |

**State transitions**:

- FixedAsset: `ACTIVE` -> `DISPOSED`

**API surface**:

| Endpoint                 | Method        | Key inputs                                                             | Key outputs       | Auth         | Key errors                         |
| ------------------------ | ------------- | ---------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------- |
| `createFixedAssetAction` | Server Action | branchId, assetCode, name, purchaseCost, usefulLifeYears, salvageValue | FixedAsset        | ASSET_MANAGE | 409 code exists                    |
| `getFixedAssetsAction`   | Server Action | branchId, status, page                                                 | List<FixedAsset>  | ASSET_VIEW   | 403 unauthorized                   |
| `runDepreciationAction`  | Server Action | assetId, periodEndDate                                                 | AssetDepreciation | ASSET_MANAGE | 400 already depreciated for period |
| `disposeAssetAction`     | Server Action | assetId, disposalAmount                                                | FixedAsset        | ASSET_MANAGE | 400 already disposed               |

**Value sourcing**:

| Action                 | Value produced / displayed | Source                                                                              |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| createFixedAssetAction | currentBookValue           | Initialized to purchaseCost                                                         |
| runDepreciationAction  | depreciationAmount         | Computed: `(purchaseCost - salvageValue) / usefulLifeYears` prorated for the period |
| runDepreciationAction  | JournalEntry totalAmount   | Matches depreciationAmount                                                          |
| disposeAssetAction     | Gain or Loss               | Computed: `disposalAmount - currentBookValue`                                       |

**Key invariants**:

- Asset `currentBookValue` cannot drop below `salvageValue` through depreciation.
- Cannot delete an asset if it has associated `AssetDepreciation` records (must dispose instead).
- All financial values stored as minor units (cents).

**Security model**:

- Managed by `ASSET_MANAGE` permission. Viewed by `ASSET_VIEW`.
- Strict multi-tenant isolation via `branchId` and `companyId`.

**Critical test scenarios**:

- Happy path: Register asset, run one month of depreciation, verify book value and ledger entry (verifies AC-1, AC-3).
- Failure case: Try to run depreciation for an already depreciated period (verifies AC-3).
- Happy path: Dispose of an asset for less than book value, verify loss journal entry (verifies AC-4).
- Auth/permission: User without ASSET_VIEW cannot fetch asset lists (verifies AC-2).

## Build plan

- [x] Step 1: Add `FixedAsset` and `AssetDepreciation` models to Prisma schema. Run `prisma db push` and `prisma generate`, satisfies **AC-1**, **AC-3**.
- [x] Step 2: Create Zod validation schemas for asset creation, depreciation, and disposal, satisfies **AC-1**, **AC-3**, **AC-4**.
- [x] Step 3: Implement server actions in `src/actions/asset-actions.ts` handling asset CRUD, depreciation calculation, and disposal GL posting, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**.
- [x] Step 4: Build fixed assets directory view at `/assets`, satisfies **AC-2**.
- [x] Step 5: Build asset detail view `/assets/[id]` with depreciation history and disposal controls, satisfies **AC-2**, **AC-4**.
- [x] Step 6: Author integration test suite in `src/__tests__/assets.test.ts` verifying depreciation math, ledger integration, and branch scoping, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.

## Consequences

**Positive**:

- Automated calculation of straight-line depreciation prevents manual spreadsheet errors.
- Tight GL integration ensures the balance sheet always reflects accurate asset values.
- Full audit history of depreciation runs and disposals.

**Tradeoffs**:

- Initial version only supports Straight Line depreciation method; accelerating methods (like double-declining balance) will require feature enhancements.
- Depreciation is run per-asset manually or via a batch endpoint, rather than a background cron job (simplifies MVP architecture).

## Follow-up

- Consider adding background cron jobs to auto-run depreciation at the end of every month.

## Rationale

See [rationale.md](rationale.md) for alternatives considered and the full context behind this decision.
