# Rationale: Inventory and Warehouse Management (spec 0011)

## Context

Enterprise multi branch operations require centralized visibility of stock levels across distributed physical warehouses. Stock discrepancies often arise from race conditions during concurrent dispatches, untracked inventory transfers, and missing audit trails.

## Decisions

### 1. Dedicated StockLevel and StockMovement Ledger

Rather than merely storing a quantity on the Item entity, we separate Item definitions from warehouse specific StockLevel rows, complemented by an append only StockMovement ledger.

- **Rationale**: Items exist organization wide, but physical stock is held in specific warehouses. The append only movement log ensures full traceability and historical inventory reconstruction.

### 2. Optimistic Concurrency with Version Columns

Every `StockLevel` record maintains an integer `version` column.

- **Rationale**: When multiple workers record dispatches simultaneously, checking the version prevents dirty writes and double spending of inventory.

### 3. Atomic Dual Leg Transfers

Inter warehouse transfers decrement the source warehouse and increment the destination warehouse inside a single database transaction.

- **Rationale**: Guarantees goods in transit are never lost or duplicated.

### 4. Integer Unit Costs in Cents

All prices and inventory valuations are stored as 64 bit integer cents.

- **Rationale**: Eliminates floating point rounding errors in financial balance sheets.
