"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  createItemCategorySchema,
  createItemSchema,
  updateItemSchema,
  recordStockMovementSchema,
  transferStockSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type CreateItemCategoryInput,
  type CreateItemInput,
  type UpdateItemInput,
  type RecordStockMovementInput,
  type TransferStockInput,
} from "@/lib/validations/inventory";
import { UnitOfMeasure, StockMovementType } from "@prisma/client";

// -------------------------------------------------------------
// Warehouse Actions
// -------------------------------------------------------------

export async function createWarehouseAction(rawInput: CreateWarehouseInput) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = createWarehouseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.warehouse.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Warehouse code '${data.code}' already exists for this company`,
    };
  }

  const warehouse = await withAuditTransaction(
    { userId: user.id, branchId: data.branchId },
    { action: "CREATE", entity: "Warehouse", entityId: "" },
    async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({
          where: { branchId: data.branchId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.create({
        data: {
          companyId: data.companyId,
          branchId: data.branchId,
          code: data.code.toUpperCase().trim(),
          name: data.name.trim(),
          address: data.address || null,
          isDefault: Boolean(data.isDefault),
        },
      });
    }
  );

  revalidatePath("/inventory/warehouses");
  revalidatePath("/inventory");
  return { success: true, warehouse };
}

export async function updateWarehouseAction(rawInput: UpdateWarehouseInput) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = updateWarehouseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.warehouse.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Warehouse not found" };
  }

  if (data.code && data.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.warehouse.findFirst({
      where: {
        companyId: existing.companyId,
        code: data.code.toUpperCase().trim(),
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Warehouse code '${data.code}' is already used by another warehouse`,
      };
    }
  }

  const warehouse = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    { action: "UPDATE", entity: "Warehouse", entityId: id, before: existing },
    async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({
          where: {
            branchId: existing.branchId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.update({
        where: { id },
        data: {
          code: data.code ? data.code.toUpperCase().trim() : existing.code,
          name: data.name ? data.name.trim() : existing.name,
          address: data.address !== undefined ? data.address : existing.address,
          isDefault:
            data.isDefault !== undefined ? data.isDefault : existing.isDefault,
        },
      });
    }
  );

  revalidatePath("/inventory/warehouses");
  revalidatePath("/inventory");
  return { success: true, warehouse };
}

export async function deleteWarehouseAction(warehouseId: string) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const existing = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Warehouse not found" };
  }

  const positiveStock = await prisma.stockLevel.findFirst({
    where: {
      warehouseId,
      quantityOnHand: { gt: 0 },
    },
  });

  if (positiveStock) {
    return {
      success: false,
      error:
        "Cannot delete warehouse with active stock on hand. Transfer or write off inventory first",
    };
  }

  await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "DELETE",
      entity: "Warehouse",
      entityId: warehouseId,
      before: existing,
    },
    async (tx) => {
      return tx.warehouse.update({
        where: { id: warehouseId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/inventory/warehouses");
  return { success: true };
}

export async function getWarehousesAction(filters?: {
  branchId?: string;
  companyId?: string;
}) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_VIEW");

  const whereClause: Record<string, unknown> = { deletedAt: null };

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.companyId) {
    whereClause.companyId = filters.companyId;
  }

  const warehouses = await prisma.warehouse.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { stockLevels: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return { success: true, warehouses };
}

// -------------------------------------------------------------
// Item Category Actions
// -------------------------------------------------------------

export async function createItemCategoryAction(
  rawInput: CreateItemCategoryInput
) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = createItemCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.itemCategory.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Category code '${data.code}' already exists for this company`,
    };
  }

  const category = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "ItemCategory", entityId: "" },
    async (tx) => {
      return tx.itemCategory.create({
        data: {
          companyId: data.companyId,
          code: data.code.toUpperCase().trim(),
          name: data.name.trim(),
          description: data.description || null,
        },
      });
    }
  );

  revalidatePath("/inventory");
  return { success: true, category };
}

export async function getItemCategoriesAction(companyId?: string) {
  await requireAuth();
  await requirePermission("INVENTORY_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, categories: [] };
  }

  const categories = await prisma.itemCategory.findMany({
    where: { companyId: targetCompanyId, deletedAt: null },
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });

  return { success: true, categories };
}

// -------------------------------------------------------------
// Item Catalog Actions
// -------------------------------------------------------------

export async function createItemAction(rawInput: CreateItemInput) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = createItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.item.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Item code '${data.code}' already exists for this company`,
    };
  }

  const item = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "Item", entityId: "" },
    async (tx) => {
      return tx.item.create({
        data: {
          companyId: data.companyId,
          categoryId: data.categoryId || null,
          code: data.code.toUpperCase().trim(),
          name: data.name.trim(),
          description: data.description || null,
          uom: data.uom as UnitOfMeasure,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          minStockLevel: data.minStockLevel,
        },
      });
    }
  );

  revalidatePath("/inventory");
  return { success: true, item };
}

export async function updateItemAction(rawInput: UpdateItemInput) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = updateItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.item.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Item not found" };
  }

  if (data.code && data.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.item.findFirst({
      where: {
        companyId: existing.companyId,
        code: data.code.toUpperCase().trim(),
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Item code '${data.code}' is already used by another item`,
      };
    }
  }

  const item = await withAuditTransaction(
    { userId: user.id },
    { action: "UPDATE", entity: "Item", entityId: id, before: existing },
    async (tx) => {
      return tx.item.update({
        where: { id },
        data: {
          categoryId:
            data.categoryId !== undefined
              ? data.categoryId
              : existing.categoryId,
          code: data.code ? data.code.toUpperCase().trim() : existing.code,
          name: data.name ? data.name.trim() : existing.name,
          description:
            data.description !== undefined
              ? data.description
              : existing.description,
          uom: data.uom ? (data.uom as UnitOfMeasure) : existing.uom,
          costPrice:
            data.costPrice !== undefined ? data.costPrice : existing.costPrice,
          sellingPrice:
            data.sellingPrice !== undefined
              ? data.sellingPrice
              : existing.sellingPrice,
          minStockLevel:
            data.minStockLevel !== undefined
              ? data.minStockLevel
              : existing.minStockLevel,
        },
      });
    }
  );

  revalidatePath("/inventory");
  return { success: true, item };
}

export async function deleteItemAction(itemId: string) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const existing = await prisma.item.findFirst({
    where: { id: itemId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Item not found" };
  }

  const activeStock = await prisma.stockLevel.findFirst({
    where: {
      itemId,
      quantityOnHand: { gt: 0 },
    },
  });

  if (activeStock) {
    return {
      success: false,
      error: "Cannot delete item with active quantity on hand in warehouses",
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    { action: "DELETE", entity: "Item", entityId: itemId, before: existing },
    async (tx) => {
      return tx.item.update({
        where: { id: itemId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/inventory");
  return { success: true };
}

export async function getItemsAction(filters?: {
  companyId?: string;
  categoryId?: string;
  search?: string;
}) {
  await requireAuth();
  await requirePermission("INVENTORY_VIEW");

  let targetCompanyId = filters?.companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, items: [] };
  }

  const whereClause: Record<string, unknown> = {
    companyId: targetCompanyId,
    deletedAt: null,
  };

  if (filters?.categoryId && filters.categoryId !== "ALL") {
    whereClause.categoryId = filters.categoryId;
  }

  if (filters?.search) {
    whereClause.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.item.findMany({
    where: whereClause,
    include: {
      category: { select: { id: true, name: true, code: true } },
      stockLevels: {
        include: {
          warehouse: {
            select: { id: true, name: true, code: true, branchId: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return { success: true, items };
}

// -------------------------------------------------------------
// Stock Movement & Concurrency Engine
// -------------------------------------------------------------

export async function recordStockMovementAction(
  rawInput: RecordStockMovementInput
) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = recordStockMovementSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const {
    warehouseId,
    itemId,
    type,
    quantity,
    unitCost,
    reference,
    notes,
    batchNumber,
  } = parsed.data;

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
  });

  if (!warehouse) {
    return { success: false, error: "Warehouse not found" };
  }

  const item = await prisma.item.findFirst({
    where: { id: itemId, deletedAt: null },
  });

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  const movementUnitCost = unitCost !== undefined ? unitCost : item.costPrice;

  try {
    const movement = await withAuditTransaction(
      { userId: user.id, branchId: warehouse.branchId },
      {
        action: "RECORD_STOCK_MOVEMENT",
        entity: "StockMovement",
        entityId: "",
      },
      async (tx) => {
        // Fetch or create current StockLevel
        let stockLevel = await tx.stockLevel.findUnique({
          where: { warehouseId_itemId: { warehouseId, itemId } },
        });

        if (!stockLevel) {
          stockLevel = await tx.stockLevel.create({
            data: {
              warehouseId,
              itemId,
              quantityOnHand: 0,
              quantityReserved: 0,
              version: 1,
            },
          });
        }

        let newQuantity = stockLevel.quantityOnHand;

        if (type === "INWARD") {
          newQuantity += quantity;
        } else if (type === "OUTWARD") {
          if (stockLevel.quantityOnHand < quantity) {
            throw new Error(
              `Insufficient stock on hand. Available: ${stockLevel.quantityOnHand}, Requested: ${quantity}`
            );
          }
          newQuantity -= quantity;
        } else if (type === "ADJUSTMENT") {
          // For adjustment, quantity represents the actual physical count
          newQuantity = quantity;
        }

        // Optimistic concurrency check: update where id and version match
        const updatedLevel = await tx.stockLevel.updateMany({
          where: {
            id: stockLevel.id,
            version: stockLevel.version,
          },
          data: {
            quantityOnHand: newQuantity,
            version: { increment: 1 },
          },
        });

        if (updatedLevel.count === 0) {
          throw new Error(
            "Stock level was modified concurrently by another transaction. Please retry"
          );
        }

        // Create Stock Movement record
        return tx.stockMovement.create({
          data: {
            companyId: warehouse.companyId,
            branchId: warehouse.branchId,
            warehouseId,
            itemId,
            type: type as StockMovementType,
            quantity,
            unitCost: movementUnitCost,
            reference: reference || null,
            notes: notes || null,
            batchNumber: batchNumber || null,
            createdByUserId: user.id,
          },
        });
      }
    );

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    return { success: true, movement };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to record stock movement",
    };
  }
}

export async function transferStockAction(rawInput: TransferStockInput) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_MANAGE");

  const parsed = transferStockSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { fromWarehouseId, toWarehouseId, itemId, quantity, reference, notes } =
    parsed.data;

  const [fromWarehouse, toWarehouse, item] = await Promise.all([
    prisma.warehouse.findFirst({
      where: { id: fromWarehouseId, deletedAt: null },
    }),
    prisma.warehouse.findFirst({
      where: { id: toWarehouseId, deletedAt: null },
    }),
    prisma.item.findFirst({ where: { id: itemId, deletedAt: null } }),
  ]);

  if (!fromWarehouse)
    return { success: false, error: "Source warehouse not found" };
  if (!toWarehouse)
    return { success: false, error: "Destination warehouse not found" };
  if (!item) return { success: false, error: "Item not found" };

  try {
    const result = await withAuditTransaction(
      { userId: user.id, branchId: fromWarehouse.branchId },
      { action: "TRANSFER_STOCK", entity: "StockMovement", entityId: "" },
      async (tx) => {
        // 1. Source warehouse stock level
        const sourceLevel = await tx.stockLevel.findUnique({
          where: {
            warehouseId_itemId: { warehouseId: fromWarehouseId, itemId },
          },
        });

        if (!sourceLevel || sourceLevel.quantityOnHand < quantity) {
          throw new Error(
            `Insufficient stock at source warehouse. Available: ${sourceLevel?.quantityOnHand ?? 0}, Requested: ${quantity}`
          );
        }

        // Update source warehouse with optimistic concurrency
        const updateSource = await tx.stockLevel.updateMany({
          where: { id: sourceLevel.id, version: sourceLevel.version },
          data: {
            quantityOnHand: sourceLevel.quantityOnHand - quantity,
            version: { increment: 1 },
          },
        });

        if (updateSource.count === 0) {
          throw new Error(
            "Source warehouse stock updated concurrently. Please retry"
          );
        }

        // 2. Destination warehouse stock level
        let destLevel = await tx.stockLevel.findUnique({
          where: { warehouseId_itemId: { warehouseId: toWarehouseId, itemId } },
        });

        if (!destLevel) {
          destLevel = await tx.stockLevel.create({
            data: {
              warehouseId: toWarehouseId,
              itemId,
              quantityOnHand: quantity,
              quantityReserved: 0,
              version: 1,
            },
          });
        } else {
          const updateDest = await tx.stockLevel.updateMany({
            where: { id: destLevel.id, version: destLevel.version },
            data: {
              quantityOnHand: destLevel.quantityOnHand + quantity,
              version: { increment: 1 },
            },
          });

          if (updateDest.count === 0) {
            throw new Error(
              "Destination warehouse stock updated concurrently. Please retry"
            );
          }
        }

        // 3. Create outbound movement on source warehouse
        const outMovement = await tx.stockMovement.create({
          data: {
            companyId: fromWarehouse.companyId,
            branchId: fromWarehouse.branchId,
            warehouseId: fromWarehouseId,
            itemId,
            type: StockMovementType.TRANSFER,
            quantity,
            unitCost: item.costPrice,
            reference: reference
              ? `${reference} (OUT)`
              : `TRF-OUT -> ${toWarehouse.name}`,
            notes: notes || `Transfer out to ${toWarehouse.name}`,
            createdByUserId: user.id,
          },
        });

        // 4. Create inbound movement on destination warehouse
        const inMovement = await tx.stockMovement.create({
          data: {
            companyId: toWarehouse.companyId,
            branchId: toWarehouse.branchId,
            warehouseId: toWarehouseId,
            itemId,
            type: StockMovementType.TRANSFER,
            quantity,
            unitCost: item.costPrice,
            reference: reference
              ? `${reference} (IN)`
              : `TRF-IN <- ${fromWarehouse.name}`,
            notes: notes || `Transfer in from ${fromWarehouse.name}`,
            createdByUserId: user.id,
          },
        });

        return { outMovement, inMovement };
      }
    );

    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");
    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to transfer stock",
    };
  }
}

export async function getStockMovementsAction(filters?: {
  branchId?: string;
  warehouseId?: string;
  itemId?: string;
}) {
  const user = await requireAuth();
  await requirePermission("INVENTORY_VIEW");

  const whereClause: Record<string, unknown> = {};

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.warehouseId && filters.warehouseId !== "ALL") {
    whereClause.warehouseId = filters.warehouseId;
  }

  if (filters?.itemId) {
    whereClause.itemId = filters.itemId;
  }

  const movements = await prisma.stockMovement.findMany({
    where: whereClause,
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      item: { select: { id: true, name: true, code: true, uom: true } },
      branch: { select: { id: true, name: true, code: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { success: true, movements };
}
