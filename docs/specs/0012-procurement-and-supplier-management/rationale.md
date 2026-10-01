# Spec 0012: Procurement and Supplier Management Rationale

## Decision: Three Way Matching Architecture

Three way matching in enterprise resource planning ensures that an organization only pays for goods that were explicitly ordered and verified as received.
We evaluate three core documents:

1. The Purchase Order (authorized prices and quantities).
2. The Goods Receipt Note (physically inspected and accepted quantities).
3. The Supplier Invoice (billed amount from the vendor).

When processing a supplier invoice:

- If the billed total matches the received quantity multiplied by the purchase order unit price (within zero variance), status transitions to `MATCHED`.
- If there is a price variance or quantity variance, status transitions to `DISCREPANCY` with human review required.
  This prevents fraudulent or inaccurate disbursements.

## Decision: Automatic Inventory Inward Movement on Goods Receipt

Rather than requiring warehouse clerks to double log stock movements after creating a Goods Receipt Note, `createGoodsReceiptAction` transactionally generates INWARD `StockMovement` records and increments `StockLevel` in the target warehouse.
This guarantees that inventory availability reflects reality immediately upon dock delivery.

## Decision: Purchase Order Approval State Machine

Purchase orders progress through strict sequential states:

- `DRAFT`: Initial draft where items and quantities can be edited freely.
- `SUBMITTED`: Awaiting management approval. Cannot edit lines without returning to draft.
- `APPROVED`: Approved for external issuance. Goods receipts can now be recorded.
- `PARTIALLY_RECEIVED`: Some items or quantities have been received via Goods Receipt Notes.
- `RECEIVED`: All ordered quantities have been completely fulfilled.
- `CANCELLED`: Cancelled prior to fulfillment. Cannot be received against.
