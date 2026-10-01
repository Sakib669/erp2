# 0011. Inventory and Warehouse Management

**Date**: 2026-10-01
**Status**: Complete

## Summary

This specification establishes multi branch inventory, physical warehouse locations, stock items, category hierarchies, and transactional stock ledger movements for our enterprise resource planning system. It enforces atomic stock balance updates with version based optimistic concurrency, prevents negative inventory balances, and records detailed audit trails for adjustments and inter warehouse transfers.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0011-inventory-and-warehouse-management/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0011-inventory-and-warehouse-management/verify.md).

## Requirements

**User stories**:

- As an inventory manager, I want to manage warehouse locations associated with specific branches.
- As a stock controller, I want to track item stock levels with unit of measure and cost prices in minor unit cents.
- As a warehouse operator, I want to post stock movements for goods receipts, stock issues, and physical counts.
- As a logistics officer, I want to transfer inventory between warehouses atomically without losing or duplicating items.
- As an auditor, I want every inventory movement recorded with timestamp, reference, and user context.

**Acceptance criteria**:

- **AC-1**: Database schema models `Warehouse`, `ItemCategory`, `Item`, `StockLevel`, and `StockMovement` with branch multi tenancy and version concurrency controls.
- **AC-2**: Server actions in [src/actions/inventory-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/inventory-actions.ts) provide validated CRUD operations for warehouses, categories, and items.
- **AC-3**: Stock movement action `recordStockMovementAction` supports INWARD, OUTWARD, and ADJUSTMENT operations and strictly rejects actions that would result in negative available inventory.
- **AC-4**: Inter warehouse transfer action `transferStockAction` atomically decrements source warehouse stock and increments destination warehouse stock inside a database transaction.
- **AC-5**: Optimistic concurrency protects `StockLevel` rows with version column increments preventing race conditions during concurrent stock updates.
- **AC-6**: Inventory views at `/inventory`, `/inventory/warehouses`, and `/inventory/movements` render stock catalogs, warehouse listings, and movement histories.

## Feature design

**Data model sketch**:

- `Warehouse`: id, companyId, branchId, code, name, address, isDefault, deletedAt, timestamps. Unique on `[companyId, code]`.
- `ItemCategory`: id, companyId, code, name, description, deletedAt, timestamps. Unique on `[companyId, code]`.
- `Item`: id, companyId, categoryId, code, name, description, uom (PCS, BOX, KG, LTR, MTR), costPrice (integer cents), sellingPrice (integer cents), minStockLevel, deletedAt, timestamps. Unique on `[companyId, code]`.
- `StockLevel`: id, warehouseId, itemId, quantityOnHand, quantityReserved, version (integer, default 1), updatedAt. Unique on `[warehouseId, itemId]`.
- `StockMovement`: id, companyId, branchId, warehouseId, itemId, type (INWARD, OUTWARD, TRANSFER, ADJUSTMENT), quantity, unitCost, reference, notes, batchNumber, createdByUserId, createdAt.

**API and Server Action surface**:

| Function                    | Module                 | Key inputs                                                                     | Key outputs                | Auth requirement                | Key errors                                 |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------ | -------------------------- | ------------------------------- | ------------------------------------------ |
| `createWarehouseAction`     | `inventory-actions.ts` | companyId, branchId, code, name, address, isDefault                            | Result with Warehouse      | SUPER_ADMIN or INVENTORY_MANAGE | 409 code exists                            |
| `updateWarehouseAction`     | `inventory-actions.ts` | warehouseId, updates                                                           | Result with Warehouse      | SUPER_ADMIN or INVENTORY_MANAGE | 404 not found                              |
| `deleteWarehouseAction`     | `inventory-actions.ts` | warehouseId                                                                    | Result with boolean        | SUPER_ADMIN or INVENTORY_MANAGE | 400 has stock                              |
| `getWarehousesAction`       | `inventory-actions.ts` | branchId                                                                       | Result with list           | INVENTORY_VIEW                  | 403 unauthorized                           |
| `createItemCategoryAction`  | `inventory-actions.ts` | companyId, code, name, description                                             | Result with ItemCategory   | SUPER_ADMIN or INVENTORY_MANAGE | 409 code exists                            |
| `getItemCategoriesAction`   | `inventory-actions.ts` | companyId                                                                      | Result with list           | INVENTORY_VIEW                  | 403 unauthorized                           |
| `createItemAction`          | `inventory-actions.ts` | companyId, categoryId, code, name, uom, costPrice, sellingPrice, minStockLevel | Result with Item           | SUPER_ADMIN or INVENTORY_MANAGE | 409 code exists                            |
| `updateItemAction`          | `inventory-actions.ts` | itemId, updates                                                                | Result with Item           | SUPER_ADMIN or INVENTORY_MANAGE | 404 not found                              |
| `deleteItemAction`          | `inventory-actions.ts` | itemId                                                                         | Result with boolean        | SUPER_ADMIN or INVENTORY_MANAGE | 400 has stock                              |
| `getItemsAction`            | `inventory-actions.ts` | companyId, categoryId, search                                                  | Result with list           | INVENTORY_VIEW                  | 403 unauthorized                           |
| `recordStockMovementAction` | `inventory-actions.ts` | warehouseId, itemId, type, quantity, unitCost, reference, notes                | Result with StockMovement  | SUPER_ADMIN or INVENTORY_MANAGE | 400 insufficient stock                     |
| `transferStockAction`       | `inventory-actions.ts` | fromWarehouseId, toWarehouseId, itemId, quantity, reference, notes             | Result with StockMovements | SUPER_ADMIN or INVENTORY_MANAGE | 400 insufficient stock, 400 same warehouse |
| `getStockMovementsAction`   | `inventory-actions.ts` | warehouseId, itemId, branchId                                                  | Result with list           | INVENTORY_VIEW                  | 403 unauthorized                           |

**Value sourcing**:

| Action or display         | Value produced or displayed                 | Source                                                    |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| Total inventory valuation | Sum of quantity times costPrice             | Calculated across all items and warehouse stock levels    |
| Negative stock rejection  | Prevents quantityOnHand dropping below zero | Evaluated before applying decrements                      |
| Concurrency check         | Atomic version increment                    | Optimistic concurrency version check on StockLevel update |

**Key invariants**:

- Available stock can never be negative.
- Every movement creates an immutable StockMovement ledger entry.
- Transfers update source and destination stock balances atomically inside a single database transaction.
- All financial values (cost price, selling price, unit cost) are stored in integer minor units (cents).

## Build plan

- [x] Step 1: Add Warehouse, ItemCategory, Item, StockLevel, and StockMovement models and enums to Prisma schema and execute database push, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for warehouses, categories, items, and movements in [src/lib/validations/inventory.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/inventory.ts), satisfies **AC-2**, **AC-3**, **AC-4**
- [x] Step 3: Implement inventory server actions with atomic concurrency and transaction controls in [src/actions/inventory-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/inventory-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Build item inventory catalog and stock levels view at `/inventory`, satisfies **AC-6**
- [x] Step 5: Build warehouse manager view at `/inventory/warehouses` and stock movements ledger view at `/inventory/movements`, satisfies **AC-6**
- [x] Step 6: Author integration test suite covering stock movements, transfer atomicity, negative stock prevention, and multi branch isolation in [src/**tests**/inventory.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/inventory.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Complete visibility into physical stock across multi branch warehouses.
- Protection against inventory shrinkage and duplicate transfer race conditions.
- Exact cents financial valuation aligned with general ledger standards.

**Tradeoffs**:

- Requires strict discipline in logging physical stock receipts and dispatches to prevent stockout errors.
