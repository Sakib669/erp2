# Verify: Inventory and Warehouse Management (spec 0011)

Steps derived from spec 0011 acceptance criteria. check verify runs these; test locks the durable ones.

## UI and manual

- Visit `/inventory` : renders inventory items catalog with stock levels, categories, and valuation metrics : AC-2, AC-6
- Click "Add Item" on `/inventory` : creates new item with unit of measure and cost prices in minor units : AC-2, AC-6
- Visit `/inventory/warehouses` : lists physical warehouses with branch associations : AC-2, AC-6
- Visit `/inventory/movements` : displays chronological stock ledger with filters for branch and type : AC-3, AC-6
- Post an INWARD movement : increments warehouse quantity on hand and writes StockMovement log : AC-3, AC-6
- Post an OUTWARD movement exceeding stock : rejects with insufficient stock error : AC-3
- Execute inter warehouse transfer : atomically transfers quantity between two warehouses : AC-4

## Commands

- `pnpm exec tsc --noEmit` : passes with zero type errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run lint` : passes with zero warnings or errors : AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run test` : runs test suite passing all inventory integration tests : AC-1, AC-2, AC-3, AC-4, AC-5
- `pnpm run build` : production build succeeds generating static and dynamic routes for /inventory : AC-6

## Acceptance criteria coverage

- AC-1 covered by Prisma schema additions for Warehouse, ItemCategory, Item, StockLevel, and StockMovement
- AC-2 covered by createWarehouseAction, createItemCategoryAction, createItemAction, and related CRUD actions
- AC-3 covered by recordStockMovementAction with negative inventory guard
- AC-4 covered by transferStockAction inside atomic database transaction
- AC-5 covered by optimistic concurrency version checks on StockLevel updates
- AC-6 covered by views at app/inventory/page.tsx, app/inventory/warehouses/page.tsx, and app/inventory/movements/page.tsx
