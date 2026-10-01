import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";

export const createSupplierSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  code: z
    .string()
    .min(1, "Supplier code is required")
    .max(50, "Supplier code cannot exceed 50 characters")
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, "Supplier name is required")
    .max(200, "Name cannot exceed 200 characters"),
  contactPerson: z.string().max(100).optional().nullable(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, "Payment terms days must be non negative")
    .default(30),
  address: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = z.object({
  id: z.string().min(1, "Supplier ID is required"),
  name: z.string().min(1, "Supplier name is required").max(200).optional(),
  contactPerson: z.string().max(100).optional().nullable(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).optional(),
  address: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const purchaseOrderItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantityOrdered: z.coerce
    .number()
    .int()
    .min(1, "Quantity ordered must be at least 1"),
  unitPrice: z.coerce
    .number()
    .int()
    .min(0, "Unit price must be non negative integer cents"),
  notes: z.string().max(255).optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  poNumber: z
    .string()
    .min(1, "PO number is required")
    .max(50, "PO number cannot exceed 50 characters")
    .transform((val) => val.trim().toUpperCase()),
  supplierId: z.string().min(1, "Supplier is required"),
  orderDate: z.coerce.date().default(() => new Date()),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one item is required in a purchase order"),
});

export const updatePurchaseOrderStatusSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order ID is required"),
  status: z.nativeEnum(PurchaseOrderStatus),
});

export const goodsReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1, "Purchase order item ID is required"),
  quantityReceived: z.coerce
    .number()
    .int()
    .min(1, "Received quantity must be at least 1"),
  notes: z.string().max(255).optional().nullable(),
});

export const createGoodsReceiptSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  grnNumber: z
    .string()
    .min(1, "GRN number is required")
    .max(50, "GRN number cannot exceed 50 characters")
    .transform((val) => val.trim().toUpperCase()),
  purchaseOrderId: z.string().min(1, "Purchase order ID is required"),
  warehouseId: z.string().min(1, "Target warehouse is required"),
  receiptDate: z.coerce.date().default(() => new Date()),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(goodsReceiptItemSchema)
    .min(1, "At least one item must be received in a goods receipt note"),
});

export const createSupplierInvoiceSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  goodsReceiptNoteId: z.string().optional().nullable(),
  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required")
    .max(100, "Invoice number cannot exceed 100 characters")
    .transform((val) => val.trim()),
  invoiceDate: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional().nullable(),
  totalAmount: z.coerce
    .number()
    .int()
    .min(0, "Total amount must be non negative integer cents"),
  paymentTerms: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.input<typeof updateSupplierSchema>;
export type PurchaseOrderItemInput = z.input<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderInput = z.input<
  typeof createPurchaseOrderSchema
>;
export type UpdatePurchaseOrderStatusInput = z.input<
  typeof updatePurchaseOrderStatusSchema
>;
export type GoodsReceiptItemInput = z.input<typeof goodsReceiptItemSchema>;
export type CreateGoodsReceiptInput = z.input<typeof createGoodsReceiptSchema>;
export type CreateSupplierInvoiceInput = z.input<
  typeof createSupplierInvoiceSchema
>;
