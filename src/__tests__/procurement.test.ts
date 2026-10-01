import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  createPurchaseOrderAction,
  updatePurchaseOrderStatusAction,
  getPurchaseOrdersAction,
  createGoodsReceiptAction,
  createSupplierInvoiceAction,
} from "@/actions/procurement-actions";
import {
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  SupplierInvoiceStatus,
  StockMovementType,
  UnitOfMeasure,
} from "@prisma/client";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
const mockCookieJar: Record<string, { value: string; options?: unknown }> = {};
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn((key: string, value: string, options?: unknown) => {
      mockCookieJar[key] = { value, options };
    }),
    get: vi.fn((key: string) => mockCookieJar[key]),
    delete: vi.fn((key: string) => {
      delete mockCookieJar[key];
    }),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/procurement",
}));

// Mock auth session
interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  activeBranchId?: string | null;
  roles: string[];
  permissions: string[];
  branches: Array<{
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
  }>;
}

let mockCurrentUser: SessionUser | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!mockCurrentUser) return null;
    return {
      user: mockCurrentUser,
      expires: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }),
}));

describe("Feature 13: Procurement and Supplier Management Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let warehouseAId: string;
  let adminUserId: string;
  let itemId1: string;
  let itemId2: string;

  beforeEach(async () => {
    await cleanDatabase();

    // 1. Create Company
    const company = await prisma.company.create({
      data: {
        name: "Omni Corp Global",
        code: "OMNI-CORP",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // 2. Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "North America Hub",
        code: "NA-HUB",
        timezone: "UTC",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "European Depot",
        code: "EU-DEPOT",
        timezone: "UTC",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // 3. Create Warehouse in Branch A
    const whA = await prisma.warehouse.create({
      data: {
        companyId,
        branchId: branchAId,
        code: "WH-NA-01",
        name: "North America Central Warehouse",
        isDefault: true,
      },
    });
    warehouseAId = whA.id;

    // 4. Create Items
    const it1 = await prisma.item.create({
      data: {
        companyId,
        code: "SKU-SERVER-RACK",
        name: "Enterprise 42U Server Rack",
        uom: UnitOfMeasure.PCS,
        costPrice: 85000, // $850.00
        sellingPrice: 120000, // $1,200.00
      },
    });
    itemId1 = it1.id;

    const it2 = await prisma.item.create({
      data: {
        companyId,
        code: "SKU-CAT6-CABLE",
        name: "Bulk Cat6 Network Cable 1000ft",
        uom: UnitOfMeasure.BOX,
        costPrice: 9000, // $90.00
        sellingPrice: 14000, // $140.00
      },
    });
    itemId2 = it2.id;

    // 5. Create Admin User
    const adminUser = await prisma.user.create({
      data: {
        email: "procurement.admin@omni.corp",
        name: "Procurement Director",
        passwordHash: await bcrypt.hash("Password123!", 10),
        status: "ACTIVE",
        activeBranchId: branchAId,
      },
    });
    adminUserId = adminUser.id;

    // Assign super admin session
    mockCurrentUser = {
      id: adminUserId,
      email: "procurement.admin@omni.corp",
      name: "Procurement Director",
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN"],
      permissions: [
        "PROCUREMENT_VIEW",
        "PROCUREMENT_MANAGE",
        "PROCUREMENT_APPROVE",
        "INVENTORY_VIEW",
        "INVENTORY_MANAGE",
      ],
      branches: [
        {
          id: branchAId,
          name: "North America Hub",
          code: "NA-HUB",
          isDefault: true,
        },
        {
          id: branchBId,
          name: "European Depot",
          code: "EU-DEPOT",
          isDefault: false,
        },
      ],
    };
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe("Supplier Management & Invariants (AC-1, AC-2)", () => {
    it("creates a supplier with contact details and payment terms", async () => {
      const res = await createSupplierAction({
        companyId,
        code: "SUP-CISCO-01",
        name: "Cisco Systems Global",
        contactPerson: "Sarah Jenkins",
        email: "orders@cisco.com",
        phone: "+1-800-553-6387",
        taxId: "TAX-US-998822",
        paymentTermsDays: 45,
        address: "170 West Tasman Dr, San Jose, CA",
      });

      expect(res.success).toBe(true);
      expect(res.supplier).toBeDefined();
      expect(res.supplier?.code).toBe("SUP-CISCO-01");
      expect(res.supplier?.paymentTermsDays).toBe(45);
      expect(res.supplier?.isActive).toBe(true);

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Supplier",
          action: "CREATE",
          entityId: res.supplier!.id,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("prevents creating duplicate supplier code in the same company", async () => {
      await createSupplierAction({
        companyId,
        code: "SUP-DELL",
        name: "Dell Technologies",
      });

      const dupRes = await createSupplierAction({
        companyId,
        code: "SUP-DELL",
        name: "Dell Secondary Branch",
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already exists");
    });

    it("updates supplier contact info and commercial terms", async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-HP",
        name: "Hewlett Packard Enterprise",
        paymentTermsDays: 30,
      });

      const updateRes = await updateSupplierAction({
        id: sup.supplier!.id,
        name: "HPE Global Solutions",
        paymentTermsDays: 60,
        email: "hpe.procurement@hpe.com",
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.supplier?.name).toBe("HPE Global Solutions");
      expect(updateRes.supplier?.paymentTermsDays).toBe(60);
      expect(updateRes.supplier?.email).toBe("hpe.procurement@hpe.com");
    });

    it("soft deletes a supplier when no active purchase orders exist", async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-TEMP",
        name: "Temporary Hardware Vendor",
      });

      const delRes = await deleteSupplierAction(sup.supplier!.id);
      expect(delRes.success).toBe(true);

      const deleted = await prisma.supplier.findUnique({
        where: { id: sup.supplier!.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it("prevents deleting a supplier with active purchase orders", async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-INTEL",
        name: "Intel Corporation",
      });

      // Create open purchase order
      await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-INTEL-001",
        supplierId: sup.supplier!.id,
        items: [{ itemId: itemId1, quantityOrdered: 2, unitPrice: 85000 }],
      });

      const delRes = await deleteSupplierAction(sup.supplier!.id);
      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain("active or open purchase orders");
    });
  });

  describe("Purchase Order Lifecycle & Approvals (AC-2)", () => {
    let supplierId: string;

    beforeEach(async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-NET-01",
        name: "Network Hardware Partners",
      });
      supplierId = sup.supplier!.id;
    });

    it("creates a purchase order in DRAFT status with multiple line items and integer cents valuation", async () => {
      const res = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-2026-001",
        supplierId,
        notes: "Urgent data center expansion order",
        items: [
          { itemId: itemId1, quantityOrdered: 5, unitPrice: 80000 }, // 5 * $800 = $4,000.00 (400000 cents)
          { itemId: itemId2, quantityOrdered: 10, unitPrice: 8500 }, // 10 * $85 = $850.00 (85000 cents)
        ],
      });

      expect(res.success).toBe(true);
      expect(res.purchaseOrder?.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(res.purchaseOrder?.items.length).toBe(2);
      expect(res.purchaseOrder?.totalAmount).toBe(485000); // $4,850.00
      expect(res.purchaseOrder?.poNumber).toBe("PO-2026-001");
    });

    it("transitions purchase order from DRAFT to SUBMITTED and to APPROVED with auditor context", async () => {
      const poRes = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-2026-002",
        supplierId,
        items: [{ itemId: itemId1, quantityOrdered: 2, unitPrice: 85000 }],
      });
      const poId = poRes.purchaseOrder!.id;

      // 1. Submit for approval
      const submitRes = await updatePurchaseOrderStatusAction({
        purchaseOrderId: poId,
        status: PurchaseOrderStatus.SUBMITTED,
      });
      expect(submitRes.success).toBe(true);
      expect(submitRes.purchaseOrder?.status).toBe(
        PurchaseOrderStatus.SUBMITTED
      );

      // 2. Approve
      const approveRes = await updatePurchaseOrderStatusAction({
        purchaseOrderId: poId,
        status: PurchaseOrderStatus.APPROVED,
      });
      expect(approveRes.success).toBe(true);
      expect(approveRes.purchaseOrder?.status).toBe(
        PurchaseOrderStatus.APPROVED
      );
      expect(approveRes.purchaseOrder?.approvedByUserId).toBe(adminUserId);
      expect(approveRes.purchaseOrder?.approvedAt).not.toBeNull();
    });

    it("rejects invalid state transitions on purchase orders", async () => {
      const poRes = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-2026-003",
        supplierId,
        items: [{ itemId: itemId1, quantityOrdered: 1, unitPrice: 85000 }],
      });
      const poId = poRes.purchaseOrder!.id;

      // Cancel order
      await updatePurchaseOrderStatusAction({
        purchaseOrderId: poId,
        status: PurchaseOrderStatus.CANCELLED,
      });

      // Attempting to approve cancelled order should fail
      const invalidApprove = await updatePurchaseOrderStatusAction({
        purchaseOrderId: poId,
        status: PurchaseOrderStatus.APPROVED,
      });
      expect(invalidApprove.success).toBe(false);
      expect(invalidApprove.error).toContain("cancelled purchase order");
    });
  });

  describe("Goods Receipt & Atomic Stock Ingestion (AC-3)", () => {
    let supplierId: string;
    let approvedPOId: string;
    let poItemId: string;

    beforeEach(async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-LOG-01",
        name: "Logistics Supplier Corp",
      });
      supplierId = sup.supplier!.id;

      // Create and approve PO for 20 server racks at $800 each
      const po = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-RECEIVE-01",
        supplierId,
        items: [{ itemId: itemId1, quantityOrdered: 20, unitPrice: 80000 }],
      });
      approvedPOId = po.purchaseOrder!.id;
      poItemId = po.purchaseOrder!.items[0].id;

      await updatePurchaseOrderStatusAction({
        purchaseOrderId: approvedPOId,
        status: PurchaseOrderStatus.SUBMITTED,
      });
      await updatePurchaseOrderStatusAction({
        purchaseOrderId: approvedPOId,
        status: PurchaseOrderStatus.APPROVED,
      });
    });

    it("rejects goods receipt against a non approved purchase order", async () => {
      const draftPO = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-DRAFT-RECEIPT",
        supplierId,
        items: [{ itemId: itemId1, quantityOrdered: 5, unitPrice: 80000 }],
      });

      const res = await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-FAIL-01",
        purchaseOrderId: draftPO.purchaseOrder!.id,
        warehouseId: warehouseAId,
        items: [
          {
            purchaseOrderItemId: draftPO.purchaseOrder!.items[0].id,
            quantityReceived: 5,
          },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Order must be APPROVED");
    });

    it("records partial goods receipt, increments warehouse stock level, and marks PO PARTIALLY_RECEIVED", async () => {
      // Receive 8 of 20 units
      const res = await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-2026-PARTIAL",
        purchaseOrderId: approvedPOId,
        warehouseId: warehouseAId,
        notes: "First partial shipment dock receipt",
        items: [
          {
            purchaseOrderItemId: poItemId,
            quantityReceived: 8,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.goodsReceiptNote).toBeDefined();
      expect(res.goodsReceiptNote?.status).toBe(GoodsReceiptStatus.COMPLETED);

      // Verify PO updated to PARTIALLY_RECEIVED
      const updatedPO = await prisma.purchaseOrder.findUnique({
        where: { id: approvedPOId },
        include: { items: true },
      });
      expect(updatedPO?.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
      expect(updatedPO?.items[0].quantityReceived).toBe(8);

      // Verify Warehouse StockLevel incremented atomically
      const stockLevel = await prisma.stockLevel.findUnique({
        where: {
          warehouseId_itemId: { warehouseId: warehouseAId, itemId: itemId1 },
        },
      });
      expect(stockLevel).not.toBeNull();
      expect(stockLevel?.quantityOnHand).toBe(8);
      expect(stockLevel?.version).toBe(2);

      // Verify StockMovement INWARD ledger entry created
      const movement = await prisma.stockMovement.findFirst({
        where: { reference: "GRN-2026-PARTIAL" },
      });
      expect(movement).not.toBeNull();
      expect(movement?.type).toBe(StockMovementType.INWARD);
      expect(movement?.quantity).toBe(8);
      expect(movement?.unitCost).toBe(80000);
    });

    it("fulfills remaining goods receipt and transitions PO to RECEIVED", async () => {
      // 1. First batch of 12 units
      await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-BATCH-1",
        purchaseOrderId: approvedPOId,
        warehouseId: warehouseAId,
        items: [{ purchaseOrderItemId: poItemId, quantityReceived: 12 }],
      });

      // 2. Second batch of remaining 8 units
      const finalGRN = await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-BATCH-2",
        purchaseOrderId: approvedPOId,
        warehouseId: warehouseAId,
        items: [{ purchaseOrderItemId: poItemId, quantityReceived: 8 }],
      });

      expect(finalGRN.success).toBe(true);

      // PO should now be RECEIVED
      const finishedPO = await prisma.purchaseOrder.findUnique({
        where: { id: approvedPOId },
      });
      expect(finishedPO?.status).toBe(PurchaseOrderStatus.RECEIVED);

      // Total warehouse stock should now be 20
      const stockLevel = await prisma.stockLevel.findUnique({
        where: {
          warehouseId_itemId: { warehouseId: warehouseAId, itemId: itemId1 },
        },
      });
      expect(stockLevel?.quantityOnHand).toBe(20);
    });

    it("rejects receiving quantities exceeding remaining ordered quantity", async () => {
      // Order was for 20 units; attempting to receive 25 should fail
      const res = await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-EXCESS-01",
        purchaseOrderId: approvedPOId,
        warehouseId: warehouseAId,
        items: [{ purchaseOrderItemId: poItemId, quantityReceived: 25 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("exceeds remaining ordered quantity");
    });
  });

  describe("Supplier Invoices & Three-Way Matching Engine (AC-4)", () => {
    let supplierId: string;
    let purchaseOrderId: string;

    beforeEach(async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-MATCH-01",
        name: "Automated AP Matching Supplier",
      });
      supplierId = sup.supplier!.id;

      // Create and approve PO for 10 cable boxes at $90 each = $900 total (90000 cents)
      const po = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-MATCH-01",
        supplierId,
        items: [{ itemId: itemId2, quantityOrdered: 10, unitPrice: 9000 }],
      });
      purchaseOrderId = po.purchaseOrder!.id;

      await updatePurchaseOrderStatusAction({
        purchaseOrderId,
        status: PurchaseOrderStatus.SUBMITTED,
      });
      await updatePurchaseOrderStatusAction({
        purchaseOrderId,
        status: PurchaseOrderStatus.APPROVED,
      });

      // Receive all 10 boxes at warehouse
      await createGoodsReceiptAction({
        companyId,
        branchId: branchAId,
        grnNumber: "GRN-MATCH-01",
        purchaseOrderId,
        warehouseId: warehouseAId,
        items: [
          {
            purchaseOrderItemId: po.purchaseOrder!.items[0].id,
            quantityReceived: 10,
          },
        ],
      });
    });

    it("verifies exact three way match between PO prices, GRN quantities, and invoice amount", async () => {
      // Exactly 10 boxes received at $90 = $900.00 (90000 cents)
      const res = await createSupplierInvoiceAction({
        companyId,
        branchId: branchAId,
        supplierId,
        purchaseOrderId,
        invoiceNumber: "INV-EXACT-001",
        totalAmount: 90000,
        paymentTerms: "Net 30 Days",
      });

      expect(res.success).toBe(true);
      expect(res.invoice?.status).toBe(SupplierInvoiceStatus.MATCHED);
      expect(res.matchResult?.status).toBe(SupplierInvoiceStatus.MATCHED);
      expect(res.matchResult?.variance).toBe(0);
    });

    it("flags discrepancy when invoice amount exceeds goods received valuation", async () => {
      // Vendor bills $1,050.00 (105000 cents) instead of agreed $900.00
      const res = await createSupplierInvoiceAction({
        companyId,
        branchId: branchAId,
        supplierId,
        purchaseOrderId,
        invoiceNumber: "INV-DISCREP-001",
        totalAmount: 105000,
      });

      expect(res.success).toBe(true);
      expect(res.invoice?.status).toBe(SupplierInvoiceStatus.DISCREPANCY);
      expect(res.matchResult?.status).toBe(SupplierInvoiceStatus.DISCREPANCY);
      expect(res.matchResult?.variance).toBe(15000); // $150.00 overcharge
    });

    it("prevents duplicate invoice number from the same supplier", async () => {
      await createSupplierInvoiceAction({
        companyId,
        branchId: branchAId,
        supplierId,
        purchaseOrderId,
        invoiceNumber: "INV-DUP-TEST",
        totalAmount: 90000,
      });

      const dupRes = await createSupplierInvoiceAction({
        companyId,
        branchId: branchAId,
        supplierId,
        purchaseOrderId,
        invoiceNumber: "INV-DUP-TEST",
        totalAmount: 90000,
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already exists");
    });
  });

  describe("Multi-Branch Isolation (AC-5)", () => {
    it("scopes purchase orders, goods receipts, and invoices by branch", async () => {
      const sup = await createSupplierAction({
        companyId,
        code: "SUP-MULTI-01",
        name: "Multi Branch Supplier",
      });

      // Branch A order
      const poA = await createPurchaseOrderAction({
        companyId,
        branchId: branchAId,
        poNumber: "PO-BRANCH-A",
        supplierId: sup.supplier!.id,
        items: [{ itemId: itemId1, quantityOrdered: 2, unitPrice: 85000 }],
      });
      expect(poA.success).toBe(true);

      // Branch B order
      const poB = await createPurchaseOrderAction({
        companyId,
        branchId: branchBId,
        poNumber: "PO-BRANCH-B",
        supplierId: sup.supplier!.id,
        items: [{ itemId: itemId1, quantityOrdered: 3, unitPrice: 85000 }],
      });
      expect(poB.success).toBe(true);

      // Query as Branch A
      const ordersA = await getPurchaseOrdersAction({ branchId: branchAId });
      expect(ordersA.success).toBe(true);
      expect(ordersA.purchaseOrders?.length).toBe(1);
      expect(ordersA.purchaseOrders?.[0].poNumber).toBe("PO-BRANCH-A");

      // Query as Branch B
      const ordersB = await getPurchaseOrdersAction({ branchId: branchBId });
      expect(ordersB.success).toBe(true);
      expect(ordersB.purchaseOrders?.length).toBe(1);
      expect(ordersB.purchaseOrders?.[0].poNumber).toBe("PO-BRANCH-B");
    });
  });
});
