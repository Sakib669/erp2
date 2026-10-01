# Spec 0012: Procurement and Supplier Management Verification

## Verification Checklist

1. **Supplier CRUD**:
   - Create supplier with unique code within company.
   - Update supplier contact details and payment terms.
   - Soft delete supplier preserving transaction history.

2. **Purchase Order Lifecycle**:
   - Create purchase order with line items and integer cents unit prices.
   - Total calculation accurately sums item lines.
   - Transition order from DRAFT to SUBMITTED and to APPROVED.
   - Block goods receipt against non approved purchase orders.

3. **Goods Receipt and Automatic Stock Ingestion**:
   - Record goods receipt against approved purchase order.
   - Verify purchase order item `quantityReceived` increments accurately.
   - Verify warehouse `StockLevel` increments atomically with version update.
   - Verify `StockMovement` INWARD entry created with proper unit cost and reference.
   - Purchase order status updates to PARTIALLY_RECEIVED or RECEIVED when fully completed.

4. **Three Way Matching Invariant**:
   - Create supplier invoice matching exact received value, status is MATCHED.
   - Create supplier invoice with price or quantity discrepancy, status is DISCREPANCY.

5. **Multi Branch Isolation**:
   - Branch scoped users cannot access purchase orders or receipts belonging to other branches.
   - Global super administrators can query across all branches.
