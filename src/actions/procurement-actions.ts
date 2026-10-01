"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { withAuditTransaction } from "@/lib/audit";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  createGoodsReceiptSchema,
  createSupplierInvoiceSchema,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
  CreateGoodsReceiptInput,
  CreateSupplierInvoiceInput,
} from "@/lib/validations/procurement";
import {
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  SupplierInvoiceStatus,
  StockMovementType,
} from "@prisma/client";

// -------------------------------------------------------------
// Supplier Management Actions
// -------------------------------------------------------------

export async function createSupplierAction(rawInput: CreateSupplierInput) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const parsed = createSupplierSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.supplier.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code,
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Supplier with code '${data.code}' already exists in this company`,
    };
  }

  const supplier = await withAuditTransaction(
    { userId: user.id, branchId: user.activeBranchId || undefined },
    { action: "CREATE", entity: "Supplier", entityId: "" },
    async (tx) => {
      return tx.supplier.create({
        data: {
          companyId: data.companyId,
          code: data.code,
          name: data.name,
          contactPerson: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          taxId: data.taxId || null,
          paymentTermsDays: data.paymentTermsDays,
          address: data.address || null,
          isActive: data.isActive,
        },
      });
    }
  );

  revalidatePath("/procurement/suppliers");
  revalidatePath("/procurement");
  return { success: true, supplier };
}

export async function updateSupplierAction(rawInput: UpdateSupplierInput) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const parsed = updateSupplierSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...updates } = parsed.data;

  const existing = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Supplier not found" };
  }

  const supplier = await withAuditTransaction(
    { userId: user.id, branchId: user.activeBranchId || undefined },
    { action: "UPDATE", entity: "Supplier", entityId: id, before: existing },
    async (tx) => {
      return tx.supplier.update({
        where: { id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.contactPerson !== undefined && {
            contactPerson: updates.contactPerson || null,
          }),
          ...(updates.email !== undefined && { email: updates.email || null }),
          ...(updates.phone !== undefined && { phone: updates.phone || null }),
          ...(updates.taxId !== undefined && { taxId: updates.taxId || null }),
          ...(updates.paymentTermsDays !== undefined && {
            paymentTermsDays: updates.paymentTermsDays,
          }),
          ...(updates.address !== undefined && {
            address: updates.address || null,
          }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        },
      });
    }
  );

  revalidatePath("/procurement/suppliers");
  return { success: true, supplier };
}

export async function deleteSupplierAction(supplierId: string) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Supplier not found" };
  }

  const activeOrders = await prisma.purchaseOrder.findFirst({
    where: {
      supplierId,
      deletedAt: null,
      status: {
        in: [
          PurchaseOrderStatus.DRAFT,
          PurchaseOrderStatus.SUBMITTED,
          PurchaseOrderStatus.APPROVED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ],
      },
    },
  });

  if (activeOrders) {
    return {
      success: false,
      error: "Cannot delete supplier with active or open purchase orders",
    };
  }

  await withAuditTransaction(
    { userId: user.id, branchId: user.activeBranchId || undefined },
    {
      action: "DELETE",
      entity: "Supplier",
      entityId: supplierId,
      before: existing,
    },
    async (tx) => {
      return tx.supplier.update({
        where: { id: supplierId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/procurement/suppliers");
  return { success: true };
}

export async function getSuppliersAction(companyId: string, search?: string) {
  await requireAuth();
  await requirePermission("PROCUREMENT_VIEW");

  const whereClause: Record<string, unknown> = {
    companyId,
    deletedAt: null,
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    include: {
      _count: { select: { purchaseOrders: true } },
    },
    orderBy: { name: "asc" },
  });

  return { success: true, suppliers };
}

// -------------------------------------------------------------
// Purchase Order Lifecycle Actions
// -------------------------------------------------------------

export async function createPurchaseOrderAction(
  rawInput: CreatePurchaseOrderInput
) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const parsed = createPurchaseOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  // Branch multi tenancy enforcement
  if (
    !user.roles.includes("SUPER_ADMIN") &&
    user.activeBranchId &&
    user.activeBranchId !== data.branchId
  ) {
    return {
      success: false,
      error:
        "Access denied. Cannot create purchase order outside your assigned branch",
    };
  }

  const [supplier, branch, existingPO] = await Promise.all([
    prisma.supplier.findFirst({
      where: { id: data.supplierId, deletedAt: null },
    }),
    prisma.branch.findFirst({ where: { id: data.branchId, deletedAt: null } }),
    prisma.purchaseOrder.findFirst({
      where: {
        companyId: data.companyId,
        poNumber: data.poNumber,
        deletedAt: null,
      },
    }),
  ]);

  if (!supplier) return { success: false, error: "Supplier not found" };
  if (!branch) return { success: false, error: "Branch not found" };
  if (existingPO)
    return {
      success: false,
      error: `Purchase order '${data.poNumber}' already exists in this company`,
    };

  // Verify all item IDs exist
  const itemIds = data.items.map((i) => i.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, deletedAt: null },
  });

  if (items.length !== itemIds.length) {
    return {
      success: false,
      error: "One or more selected items do not exist or have been deleted",
    };
  }

  // Calculate totals in integer minor units (cents)
  let computedTotal = 0;
  const lineItemsData = data.items.map((it) => {
    const lineTotal = it.quantityOrdered * it.unitPrice;
    computedTotal += lineTotal;
    return {
      itemId: it.itemId,
      quantityOrdered: it.quantityOrdered,
      quantityReceived: 0,
      unitPrice: it.unitPrice,
      lineTotal,
      notes: it.notes || null,
    };
  });

  try {
    const purchaseOrder = await withAuditTransaction(
      { userId: user.id, branchId: data.branchId },
      { action: "CREATE", entity: "PurchaseOrder", entityId: "" },
      async (tx) => {
        return tx.purchaseOrder.create({
          data: {
            companyId: data.companyId,
            branchId: data.branchId,
            poNumber: data.poNumber,
            supplierId: data.supplierId,
            status: PurchaseOrderStatus.DRAFT,
            orderDate: data.orderDate,
            expectedDeliveryDate: data.expectedDeliveryDate || null,
            totalAmount: computedTotal,
            taxAmount: 0,
            notes: data.notes || null,
            createdByUserId: user.id,
            items: {
              create: lineItemsData,
            },
          },
          include: {
            supplier: { select: { id: true, name: true, code: true } },
            items: { include: { item: true } },
            branch: { select: { id: true, name: true, code: true } },
          },
        });
      }
    );

    revalidatePath("/procurement/orders");
    revalidatePath("/procurement");
    return { success: true, purchaseOrder };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to create purchase order",
    };
  }
}

export async function updatePurchaseOrderStatusAction(
  rawInput: UpdatePurchaseOrderStatusInput
) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_APPROVE");

  const parsed = updatePurchaseOrderStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { purchaseOrderId, status: nextStatus } = parsed.data;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, deletedAt: null },
    include: { items: true },
  });

  if (!po) {
    return { success: false, error: "Purchase order not found" };
  }

  // Branch multi tenancy enforcement
  if (
    !user.roles.includes("SUPER_ADMIN") &&
    user.activeBranchId &&
    user.activeBranchId !== po.branchId
  ) {
    return {
      success: false,
      error: "Access denied. Cannot update purchase order outside your branch",
    };
  }

  // Validate state transitions
  if (po.status === PurchaseOrderStatus.CANCELLED) {
    return {
      success: false,
      error: "Cannot change status of a cancelled purchase order",
    };
  }

  if (po.status === PurchaseOrderStatus.RECEIVED) {
    return {
      success: false,
      error: "Cannot change status of a completely received purchase order",
    };
  }

  if (
    nextStatus === PurchaseOrderStatus.APPROVED &&
    po.status !== PurchaseOrderStatus.SUBMITTED &&
    po.status !== PurchaseOrderStatus.DRAFT
  ) {
    return {
      success: false,
      error: `Cannot approve order currently in status '${po.status}'`,
    };
  }

  if (
    nextStatus === PurchaseOrderStatus.CANCELLED &&
    po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
  ) {
    return {
      success: false,
      error: "Cannot cancel a purchase order that has already received goods",
    };
  }

  const updateData: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === PurchaseOrderStatus.APPROVED) {
    updateData.approvedByUserId = user.id;
    updateData.approvedAt = new Date();
  }

  const updatedPO = await withAuditTransaction(
    { userId: user.id, branchId: po.branchId },
    {
      action: "UPDATE_STATUS",
      entity: "PurchaseOrder",
      entityId: purchaseOrderId,
      before: po,
    },
    async (tx) => {
      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: updateData,
        include: {
          supplier: true,
          items: { include: { item: true } },
          branch: true,
        },
      });
    }
  );

  revalidatePath("/procurement/orders");
  revalidatePath("/procurement");
  return { success: true, purchaseOrder: updatedPO };
}

export async function getPurchaseOrdersAction(filters?: {
  branchId?: string;
  companyId?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_VIEW");

  const whereClause: Record<string, unknown> = { deletedAt: null };

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.companyId) {
    whereClause.companyId = filters.companyId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.supplierId && filters.supplierId !== "ALL") {
    whereClause.supplierId = filters.supplierId;
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: whereClause,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: true } },
        },
      },
      _count: { select: { goodsReceiptNotes: true, supplierInvoices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, purchaseOrders };
}

export async function getPurchaseOrderDetailsAction(orderId: string) {
  await requireAuth();
  await requirePermission("PROCUREMENT_VIEW");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, deletedAt: null },
    include: {
      supplier: true,
      branch: true,
      createdByUser: { select: { id: true, name: true, email: true } },
      approvedByUser: { select: { id: true, name: true, email: true } },
      items: {
        include: { item: true },
      },
      goodsReceiptNotes: {
        include: {
          warehouse: true,
          receivedByUser: { select: { id: true, name: true } },
          items: { include: { item: true } },
        },
      },
      supplierInvoices: true,
    },
  });

  if (!po) return { success: false, error: "Purchase order not found" };

  return { success: true, purchaseOrder: po };
}

// -------------------------------------------------------------
// Goods Receipt Notes & Atomic Stock Ingestion
// -------------------------------------------------------------

export async function createGoodsReceiptAction(
  rawInput: CreateGoodsReceiptInput
) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const parsed = createGoodsReceiptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    companyId,
    branchId,
    grnNumber,
    purchaseOrderId,
    warehouseId,
    receiptDate,
    notes,
    items,
  } = parsed.data;

  // Branch multi tenancy enforcement
  if (
    !user.roles.includes("SUPER_ADMIN") &&
    user.activeBranchId &&
    user.activeBranchId !== branchId
  ) {
    return {
      success: false,
      error: "Access denied. Cannot create goods receipt outside your branch",
    };
  }

  const [po, warehouse, existingGRN] = await Promise.all([
    prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, deletedAt: null },
      include: { items: true },
    }),
    prisma.warehouse.findFirst({
      where: { id: warehouseId, deletedAt: null },
    }),
    prisma.goodsReceiptNote.findFirst({
      where: { companyId, grnNumber },
    }),
  ]);

  if (!po) return { success: false, error: "Purchase order not found" };
  if (!warehouse)
    return { success: false, error: "Target warehouse not found" };
  if (existingGRN)
    return {
      success: false,
      error: `Goods receipt note '${grnNumber}' already exists`,
    };

  if (
    po.status !== PurchaseOrderStatus.APPROVED &&
    po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
  ) {
    return {
      success: false,
      error: `Cannot receive goods for purchase order in '${po.status}' status. Order must be APPROVED`,
    };
  }

  try {
    const grn = await withAuditTransaction(
      { userId: user.id, branchId },
      {
        action: "CREATE_GOODS_RECEIPT",
        entity: "GoodsReceiptNote",
        entityId: "",
      },
      async (tx) => {
        // Validate each line and update PO items + stock levels + movements
        const grnItemsData: {
          purchaseOrderItemId: string;
          itemId: string;
          quantityReceived: number;
          unitCost: number;
          notes: string | null;
        }[] = [];

        for (const inputItem of items) {
          const poItem = po.items.find(
            (i) => i.id === inputItem.purchaseOrderItemId
          );
          if (!poItem) {
            throw new Error(
              `Purchase order item '${inputItem.purchaseOrderItemId}' not found on order`
            );
          }

          const remainingExpected =
            poItem.quantityOrdered - poItem.quantityReceived;
          if (inputItem.quantityReceived > remainingExpected) {
            throw new Error(
              `Received quantity (${inputItem.quantityReceived}) exceeds remaining ordered quantity (${remainingExpected}) for item`
            );
          }

          // 1. Update purchase order item quantity received
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
              quantityReceived: { increment: inputItem.quantityReceived },
            },
          });

          // 2. Fetch or create StockLevel in target warehouse
          let stockLevel = await tx.stockLevel.findUnique({
            where: {
              warehouseId_itemId: { warehouseId, itemId: poItem.itemId },
            },
          });

          if (!stockLevel) {
            stockLevel = await tx.stockLevel.create({
              data: {
                warehouseId,
                itemId: poItem.itemId,
                quantityOnHand: 0,
                quantityReserved: 0,
                version: 1,
              },
            });
          }

          // 3. Atomically increment stock level with optimistic concurrency check
          const updatedLevel = await tx.stockLevel.updateMany({
            where: { id: stockLevel.id, version: stockLevel.version },
            data: {
              quantityOnHand: { increment: inputItem.quantityReceived },
              version: { increment: 1 },
            },
          });

          if (updatedLevel.count === 0) {
            throw new Error(
              "Concurrent stock modification detected during receipt. Please retry"
            );
          }

          // 4. Record INWARD stock movement ledger entry
          await tx.stockMovement.create({
            data: {
              companyId,
              branchId,
              warehouseId,
              itemId: poItem.itemId,
              type: StockMovementType.INWARD,
              quantity: inputItem.quantityReceived,
              unitCost: poItem.unitPrice,
              reference: grnNumber,
              notes: notes || `Goods receipt from PO ${po.poNumber}`,
              createdByUserId: user.id,
            },
          });

          grnItemsData.push({
            purchaseOrderItemId: poItem.id,
            itemId: poItem.itemId,
            quantityReceived: inputItem.quantityReceived,
            unitCost: poItem.unitPrice,
            notes: inputItem.notes || null,
          });
        }

        // 5. Evaluate overall Purchase Order fulfillment status
        const updatedPOItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId },
        });

        const isFullyReceived = updatedPOItems.every(
          (line) => line.quantityReceived >= line.quantityOrdered
        );

        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: {
            status: isFullyReceived
              ? PurchaseOrderStatus.RECEIVED
              : PurchaseOrderStatus.PARTIALLY_RECEIVED,
          },
        });

        // 6. Create GoodsReceiptNote
        return tx.goodsReceiptNote.create({
          data: {
            companyId,
            branchId,
            grnNumber,
            purchaseOrderId,
            warehouseId,
            receiptDate,
            status: GoodsReceiptStatus.COMPLETED,
            notes: notes || null,
            receivedByUserId: user.id,
            items: {
              create: grnItemsData,
            },
          },
          include: {
            purchaseOrder: true,
            warehouse: true,
            items: { include: { item: true } },
          },
        });
      }
    );

    revalidatePath("/procurement/receipts");
    revalidatePath("/procurement/orders");
    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    return { success: true, goodsReceiptNote: grn };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to record goods receipt",
    };
  }
}

export async function getGoodsReceiptsAction(filters?: {
  branchId?: string;
  purchaseOrderId?: string;
}) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_VIEW");

  const whereClause: Record<string, unknown> = {};

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.purchaseOrderId) {
    whereClause.purchaseOrderId = filters.purchaseOrderId;
  }

  const receipts = await prisma.goodsReceiptNote.findMany({
    where: whereClause,
    include: {
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          supplier: { select: { id: true, name: true } },
        },
      },
      warehouse: { select: { id: true, name: true, code: true } },
      receivedByUser: { select: { id: true, name: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, receipts };
}

// -------------------------------------------------------------
// Supplier Invoice & Three-Way Matching Engine
// -------------------------------------------------------------

export async function createSupplierInvoiceAction(
  rawInput: CreateSupplierInvoiceInput
) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_MANAGE");

  const parsed = createSupplierInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    companyId,
    branchId,
    supplierId,
    purchaseOrderId,
    goodsReceiptNoteId,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    paymentTerms,
    notes,
  } = parsed.data;

  // Branch isolation check
  if (
    !user.roles.includes("SUPER_ADMIN") &&
    user.activeBranchId &&
    user.activeBranchId !== branchId
  ) {
    return {
      success: false,
      error: "Access denied. Cannot process invoice outside your branch",
    };
  }

  const [po, supplier, existingInvoice] = await Promise.all([
    prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, deletedAt: null },
      include: { items: true },
    }),
    prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    }),
    prisma.supplierInvoice.findFirst({
      where: { companyId, supplierId, invoiceNumber, deletedAt: null },
    }),
  ]);

  if (!po) return { success: false, error: "Purchase order not found" };
  if (!supplier) return { success: false, error: "Supplier not found" };
  if (existingInvoice)
    return {
      success: false,
      error: `Invoice '${invoiceNumber}' from this supplier already exists`,
    };

  // Three-way matching evaluation:
  // Calculate total monetary value of actually received goods across PO items
  let totalReceivedValue = 0;
  for (const item of po.items) {
    totalReceivedValue += item.quantityReceived * item.unitPrice;
  }

  let matchStatus: SupplierInvoiceStatus = SupplierInvoiceStatus.PENDING_MATCH;
  if (totalReceivedValue > 0 && totalReceivedValue === totalAmount) {
    matchStatus = SupplierInvoiceStatus.MATCHED;
  } else {
    matchStatus = SupplierInvoiceStatus.DISCREPANCY;
  }

  try {
    const invoice = await withAuditTransaction(
      { userId: user.id, branchId },
      {
        action: "CREATE_SUPPLIER_INVOICE",
        entity: "SupplierInvoice",
        entityId: "",
      },
      async (tx) => {
        return tx.supplierInvoice.create({
          data: {
            companyId,
            branchId,
            supplierId,
            purchaseOrderId,
            goodsReceiptNoteId: goodsReceiptNoteId || null,
            invoiceNumber,
            invoiceDate,
            dueDate: dueDate || null,
            totalAmount,
            status: matchStatus,
            paymentTerms: paymentTerms || null,
            notes: notes || null,
            createdByUserId: user.id,
          },
          include: {
            supplier: true,
            purchaseOrder: true,
            goodsReceiptNote: true,
          },
        });
      }
    );

    revalidatePath("/procurement/invoices");
    revalidatePath("/procurement");
    return {
      success: true,
      invoice,
      matchResult: {
        status: matchStatus,
        totalReceivedValue,
        invoicedAmount: totalAmount,
        variance: totalAmount - totalReceivedValue,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to record supplier invoice",
    };
  }
}

export async function getSupplierInvoicesAction(filters?: {
  branchId?: string;
  supplierId?: string;
  status?: SupplierInvoiceStatus;
}) {
  const user = await requireAuth();
  await requirePermission("PROCUREMENT_VIEW");

  const whereClause: Record<string, unknown> = { deletedAt: null };

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.supplierId && filters.supplierId !== "ALL") {
    whereClause.supplierId = filters.supplierId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  const invoices = await prisma.supplierInvoice.findMany({
    where: whereClause,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      purchaseOrder: {
        select: { id: true, poNumber: true, totalAmount: true },
      },
      goodsReceiptNote: { select: { id: true, grnNumber: true } },
      createdByUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, invoices };
}
