# 0012. Procurement and Supplier Management

**Date**: 2026-10-01
**Status**: Completed

## Summary

This specification establishes multi branch procurement, vendor management, purchase orders, goods receipt notes (GRN), supplier invoice billing, and three way matching for our enterprise resource planning system. It coordinates suppliers, approved order lifecycles, atomic stock receipt ingestion into warehouse stock levels, and accounts payable invoice matching with full audit trail coverage.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0012-procurement-and-supplier-management/rationale.md).
Verification checklist is recorded in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0012-procurement-and-supplier-management/verify.md).

## Requirements

**User stories**:

- As a procurement officer, I want to manage supplier records with contact details and payment terms.
- As a purchasing manager, I want to create, submit, and approve purchase orders with line items and integer cents pricing.
- As a warehouse receiving clerk, I want to process goods receipt notes against purchase orders, automatically updating warehouse stock levels and stock movement ledgers.
- As an accounts payable accountant, I want to record supplier invoices and run three way matching against purchase order lines and goods receipt quantities to prevent overbilling or duplicate billing.
- As an auditor, I want every procurement transition, receipt, and invoice approval logged transactionally in the audit log.

**Acceptance criteria**:

- **AC-1**: Database schema models `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceiptNote`, `GoodsReceiptItem`, and `SupplierInvoice` with branch multi tenancy, soft deletes, and status enums.
- **AC-2**: Server actions in [src/actions/procurement-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/procurement-actions.ts) provide validated operations for supplier management, purchase order lifecycle (DRAFT -> SUBMITTED -> APPROVED -> RECEIVED / CANCELLED).
- **AC-3**: Goods receipt action `createGoodsReceiptAction` accepts ordered line items, creates goods receipt note, automatically generates INWARD `StockMovement` records, and increments warehouse `StockLevel` with version concurrency checks.
- **AC-4**: Supplier invoice action `createSupplierInvoiceAction` creates vendor billing records and evaluates three way matching between PO unit price, GRN received quantities, and billed invoice amounts, setting status to MATCHED or DISCREPANCY.
- **AC-5**: Branch isolation strictly enforces access boundaries so users only view and mutate purchase orders, receipts, and invoices within their assigned branch scope.
- **AC-6**: Procurement views at `/procurement`, `/procurement/suppliers`, `/procurement/orders`, `/procurement/receipts`, and `/procurement/invoices` render responsive management tables and status badges.

## Feature design

**Data model sketch**:

- `Supplier`: id, companyId, code, name, contactPerson, email, phone, taxId, paymentTermsDays (default 30), address, isActive, deletedAt, timestamps. Unique on `[companyId, code]`.
- `PurchaseOrder`: id, companyId, branchId, poNumber, supplierId, status (DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED), orderDate, expectedDeliveryDate, totalAmount (minor units integer cents), taxAmount (integer cents), notes, createdByUserId, approvedByUserId, approvedAt, deletedAt, timestamps. Unique on `[companyId, poNumber]`.
- `PurchaseOrderItem`: id, purchaseOrderId, itemId, quantityOrdered, quantityReceived, unitPrice (integer cents), lineTotal (integer cents), notes.
- `GoodsReceiptNote`: id, companyId, branchId, grnNumber, purchaseOrderId, warehouseId, receiptDate, status (COMPLETED, CANCELLED), notes, receivedByUserId, createdAt. Unique on `[companyId, grnNumber]`.
- `GoodsReceiptItem`: id, goodsReceiptNoteId, purchaseOrderItemId, itemId, quantityReceived, unitCost (integer cents), notes.
- `SupplierInvoice`: id, companyId, branchId, invoiceNumber, supplierId, purchaseOrderId, goodsReceiptNoteId (optional), invoiceDate, dueDate, totalAmount (integer cents), status (PENDING_MATCH, MATCHED, DISCREPANCY, PAID, CANCELLED), paymentTerms, notes, createdByUserId, createdAt, updatedAt. Unique on `[companyId, supplierId, invoiceNumber]`.

**API and Server Action surface**:

| Function                          | Module                   | Key inputs                                                                                     | Key outputs                                 | Auth requirement                   | Key errors              |
| --------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------- | ----------------------- |
| `createSupplierAction`            | `procurement-actions.ts` | companyId, code, name, email, phone, paymentTermsDays, address                                 | Result with Supplier                        | SUPER_ADMIN or PROCUREMENT_MANAGE  | 409 code exists         |
| `updateSupplierAction`            | `procurement-actions.ts` | supplierId, updates                                                                            | Result with Supplier                        | SUPER_ADMIN or PROCUREMENT_MANAGE  | 404 not found           |
| `deleteSupplierAction`            | `procurement-actions.ts` | supplierId                                                                                     | Result with boolean                         | SUPER_ADMIN or PROCUREMENT_MANAGE  | 400 has open orders     |
| `getSuppliersAction`              | `procurement-actions.ts` | companyId, search                                                                              | Result with list                            | PROCUREMENT_VIEW                   | 403 unauthorized        |
| `createPurchaseOrderAction`       | `procurement-actions.ts` | branchId, supplierId, expectedDeliveryDate, items, notes                                       | Result with PurchaseOrder                   | SUPER_ADMIN or PROCUREMENT_MANAGE  | 400 empty items         |
| `updatePurchaseOrderStatusAction` | `procurement-actions.ts` | purchaseOrderId, status (SUBMITTED, APPROVED, CANCELLED)                                       | Result with PurchaseOrder                   | SUPER_ADMIN or PROCUREMENT_APPROVE | 400 invalid transition  |
| `getPurchaseOrdersAction`         | `procurement-actions.ts` | branchId, status, supplierId                                                                   | Result with list                            | PROCUREMENT_VIEW                   | 403 unauthorized        |
| `createGoodsReceiptAction`        | `procurement-actions.ts` | purchaseOrderId, warehouseId, items (poItemId, quantityReceived), notes                        | Result with GoodsReceiptNote                | SUPER_ADMIN or PROCUREMENT_MANAGE  | 400 exceeds ordered qty |
| `getGoodsReceiptsAction`          | `procurement-actions.ts` | branchId, purchaseOrderId                                                                      | Result with list                            | PROCUREMENT_VIEW                   | 403 unauthorized        |
| `createSupplierInvoiceAction`     | `procurement-actions.ts` | branchId, supplierId, purchaseOrderId, invoiceNumber, invoiceDate, dueDate, totalAmount, notes | Result with SupplierInvoice and matchResult | SUPER_ADMIN or PROCUREMENT_MANAGE  | 409 duplicate invoice   |
| `getSupplierInvoicesAction`       | `procurement-actions.ts` | branchId, status, supplierId                                                                   | Result with list                            | PROCUREMENT_VIEW                   | 403 unauthorized        |

**Value sourcing**:

| Action or display           | Value produced or displayed                  | Source                                                                           |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Purchase order total amount | Sum of items quantityOrdered times unitPrice | Computed server side on creation and update                                      |
| Received quantity tracking  | Incremented on PurchaseOrderItem             | Updated atomically upon GoodsReceiptNote creation                                |
| Three way matching status   | MATCHED or DISCREPANCY                       | Calculated by comparing PO unit price and GRN quantity with Invoice total amount |
| Stock level increment       | Added to warehouse quantityOnHand            | Automatically triggered inside GoodsReceiptNote creation transaction             |

**Key invariants**:

- Purchase orders cannot receive goods unless approved.
- Received goods quantity on purchase order item cannot exceed ordered quantity.
- Goods receipt creation updates stock level and records immutable INWARD stock movement atomically.
- Supplier invoice three way match compares invoiced amount against received goods valuation. Discrepancy flags price or quantity mismatches.
- Monetary values are stored as positive integer minor units in cents.
- Soft delete preserves supplier and purchase order records.

## Build plan

- [x] Step 1: Add Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceiptNote, GoodsReceiptItem, and SupplierInvoice models and enums to Prisma schema and push to database, satisfies **AC-1**
- [x] Step 2: Author Zod validation schemas for suppliers, purchase orders, goods receipts, and supplier invoices in [src/lib/validations/procurement.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/lib/validations/procurement.ts), satisfies **AC-2**, **AC-3**, **AC-4**
- [x] Step 3: Implement procurement server actions with transactional stock ingestion and three way matching in [src/actions/procurement-actions.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/actions/procurement-actions.ts), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
- [x] Step 4: Build supplier management directory view at `/procurement/suppliers` and purchase order manager view at `/procurement/orders`, satisfies **AC-6**
- [x] Step 5: Build goods receipt manager view at `/procurement/receipts` and supplier invoices view at `/procurement/invoices`, satisfies **AC-6**
- [x] Step 6: Build procurement overview dashboard at `/procurement`, satisfies **AC-6**
- [x] Step 7: Author integration test suite covering supplier CRUD, PO approval lifecycle, goods receipt stock ingestion, three way matching, and branch scoping in [src/**tests**/procurement.test.ts](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/__tests__/procurement.test.ts), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:

- Automated inventory replenishment directly linked to vendor purchase orders.
- Eliminates overpayment through rigorous three way matching.
- Full traceability from requisition to goods receipt and vendor payment.

**Tradeoffs**:

- Requires invoice entry to reference valid purchase orders for automated three way matching.
