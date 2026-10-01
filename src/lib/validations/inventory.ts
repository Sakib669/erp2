import { z } from "zod";

export const unitOfMeasureEnum = z.enum([
  "PCS",
  "BOX",
  "KG",
  "LTR",
  "MTR",
  "PACK",
]);

export const stockMovementTypeEnum = z.enum([
  "INWARD",
  "OUTWARD",
  "TRANSFER",
  "ADJUSTMENT",
]);

// -------------------------------------------------------------
// Warehouse Validation Schemas
// -------------------------------------------------------------

export const createWarehouseSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  branchId: z.string().min(1, "Branch assignment is required"),
  code: z
    .string()
    .min(1, "Warehouse code is required")
    .max(20, "Warehouse code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, and underscores"
    ),
  name: z.string().min(1, "Warehouse name is required").max(100),
  address: z.string().max(255).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateWarehouseSchema = z.object({
  id: z.string().min(1, "Warehouse ID is required"),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(255).optional(),
  isDefault: z.boolean().optional(),
});

// -------------------------------------------------------------
// Item Category Validation Schemas
// -------------------------------------------------------------

export const createItemCategorySchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  code: z
    .string()
    .min(1, "Category code is required")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(255).optional(),
});

// -------------------------------------------------------------
// Item Validation Schemas
// -------------------------------------------------------------

export const createItemSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  categoryId: z.string().optional(),
  code: z
    .string()
    .min(1, "Item code is required")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1, "Item name is required").max(150),
  description: z.string().max(500).optional(),
  uom: unitOfMeasureEnum.optional().default("PCS"),
  costPrice: z.number().int().min(0, "Cost price must be non negative"),
  sellingPrice: z.number().int().min(0, "Selling price must be non negative"),
  minStockLevel: z
    .number()
    .int()
    .min(0, "Minimum stock level must be non negative")
    .optional()
    .default(0),
});

export const updateItemSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
  categoryId: z.string().optional(),
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
  uom: unitOfMeasureEnum.optional(),
  costPrice: z.number().int().min(0).optional(),
  sellingPrice: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
});

// -------------------------------------------------------------
// Stock Movement Validation Schemas
// -------------------------------------------------------------

export const recordStockMovementSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  itemId: z.string().min(1, "Item is required"),
  type: z.enum(["INWARD", "OUTWARD", "ADJUSTMENT"]),
  quantity: z.number().int().min(1, "Movement quantity must be at least 1"),
  unitCost: z.number().int().min(0).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  batchNumber: z.string().max(50).optional(),
});

export const transferStockSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "Source warehouse is required"),
    toWarehouseId: z.string().min(1, "Destination warehouse is required"),
    itemId: z.string().min(1, "Item is required"),
    quantity: z.number().int().min(1, "Transfer quantity must be at least 1"),
    reference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

export type CreateWarehouseInput = z.input<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.input<typeof updateWarehouseSchema>;
export type CreateItemCategoryInput = z.input<typeof createItemCategorySchema>;
export type CreateItemInput = z.input<typeof createItemSchema>;
export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type RecordStockMovementInput = z.input<
  typeof recordStockMovementSchema
>;
export type TransferStockInput = z.input<typeof transferStockSchema>;
