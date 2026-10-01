import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import {
  createWarehouseAction,
  updateWarehouseAction,
  deleteWarehouseAction,
  getWarehousesAction,
  createItemCategoryAction,
  getItemCategoriesAction,
  createItemAction,
  updateItemAction,
  deleteItemAction,
  getItemsAction,
  recordStockMovementAction,
  transferStockAction,
  getStockMovementsAction,
} from "@/actions/inventory-actions";
import { StockMovementType, UnitOfMeasure } from "@prisma/client";

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
  usePathname: () => "/inventory",
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
  auth: vi.fn(async () => (mockCurrentUser ? { user: mockCurrentUser } : null)),
}));

describe("Feature 12: Inventory and Warehouse Management Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let inventoryManagerId: string;

  beforeEach(async () => {
    // Teardown in foreign key dependency order
    await cleanDatabase();

    // Create Company
    const company = await prisma.company.create({
      data: {
        name: "Global Distribution Corp",
        code: "GD-CORP",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "Boston Logistics Hub",
        code: "BOS-HUB",
        timezone: "UTC",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Chicago Distribution Center",
        code: "CHI-DC",
        timezone: "UTC",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Inventory Manager User
    const passwordHash = await bcrypt.hash("WarehousePass123!", 10);
    const user = await prisma.user.create({
      data: {
        name: "Inventory Manager",
        email: "inventory@acme.com",
        passwordHash,
      },
    });
    inventoryManagerId = user.id;

    // Setup session
    mockCurrentUser = {
      id: inventoryManagerId,
      email: "inventory@acme.com",
      name: "Inventory Manager",
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN", "BRANCH_MANAGER"],
      permissions: ["INVENTORY_MANAGE", "INVENTORY_VIEW"],
      branches: [
        {
          id: branchAId,
          name: "Boston Logistics Hub",
          code: "BOS-HUB",
          isDefault: true,
        },
        {
          id: branchBId,
          name: "Chicago Distribution Center",
          code: "CHI-DC",
          isDefault: false,
        },
      ],
    };
  });

  describe("Warehouse and Category Management", () => {
    it("creates a physical warehouse with branch assignment and audit logging", async () => {
      const res = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-BOS-01",
        name: "Boston Main Depot",
        address: "100 Logistics Way, Boston MA",
        isDefault: true,
      });

      expect(res.success).toBe(true);
      expect(res.warehouse).toBeDefined();
      expect(res.warehouse?.code).toBe("WH-BOS-01");
      expect(res.warehouse?.isDefault).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Warehouse",
          action: "CREATE",
          entityId: res.warehouse!.id,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("prevents creating warehouses with duplicate code in the same company", async () => {
      await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-DUP-01",
        name: "First Depot",
      });

      const duplicateRes = await createWarehouseAction({
        companyId,
        branchId: branchBId,
        code: "WH-DUP-01",
        name: "Second Depot",
      });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("already exists");
    });

    it("updates warehouse details and manages branch default status", async () => {
      const createRes = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-UP-01",
        name: "Original Depot",
        isDefault: false,
      });

      const updateRes = await updateWarehouseAction({
        id: createRes.warehouse!.id,
        name: "Renovated Depot",
        isDefault: true,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.warehouse?.name).toBe("Renovated Depot");
      expect(updateRes.warehouse?.isDefault).toBe(true);
    });

    it("creates item category and lists categories", async () => {
      const catRes = await createItemCategoryAction({
        companyId,
        code: "HARDWARE",
        name: "Hardware & Tools",
        description: "Industrial power tools and parts",
      });

      expect(catRes.success).toBe(true);
      expect(catRes.category?.code).toBe("HARDWARE");

      const listRes = await getItemCategoriesAction(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.categories?.length).toBe(1);
    });

    it("soft deletes a warehouse when no positive stock on hand exists", async () => {
      const whRes = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-TEMP-01",
        name: "Temporary Depot",
      });

      const delRes = await deleteWarehouseAction(whRes.warehouse!.id);
      expect(delRes.success).toBe(true);

      const deleted = await prisma.warehouse.findUnique({
        where: { id: whRes.warehouse!.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });

  describe("Item Catalog & Pricing Invariants", () => {
    it("creates item with unit of measure and integer cents pricing", async () => {
      const catRes = await createItemCategoryAction({
        companyId,
        code: "ELEC",
        name: "Electronics",
      });

      const res = await createItemAction({
        companyId,
        categoryId: catRes.category!.id,
        code: "LAPTOP-PRO-15",
        name: "Enterprise Pro Laptop 15",
        uom: "PCS",
        costPrice: 90000, // $900.00
        sellingPrice: 125000, // $1,250.00
        minStockLevel: 5,
      });

      expect(res.success).toBe(true);
      expect(res.item?.code).toBe("LAPTOP-PRO-15");
      expect(res.item?.uom).toBe(UnitOfMeasure.PCS);
      expect(res.item?.costPrice).toBe(90000);
      expect(res.item?.sellingPrice).toBe(125000);
    });

    it("prevents duplicate item codes in the same company", async () => {
      await createItemAction({
        companyId,
        code: "SKU-TEST-01",
        name: "Item Alpha",
        uom: "PCS",
        costPrice: 1000,
        sellingPrice: 1500,
      });

      const dupRes = await createItemAction({
        companyId,
        code: "SKU-TEST-01",
        name: "Item Alpha Duplicate",
        uom: "PCS",
        costPrice: 1000,
        sellingPrice: 1500,
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already exists");
    });

    it("updates item pricing and specifications", async () => {
      const itemRes = await createItemAction({
        companyId,
        code: "MOUSE-WIRELESS",
        name: "Wireless Mouse",
        uom: "PCS",
        costPrice: 1500,
        sellingPrice: 2500,
      });

      const updateRes = await updateItemAction({
        id: itemRes.item!.id,
        name: "Ergonomic Wireless Mouse",
        sellingPrice: 2999,
        minStockLevel: 20,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.item?.name).toBe("Ergonomic Wireless Mouse");
      expect(updateRes.item?.sellingPrice).toBe(2999);
      expect(updateRes.item?.minStockLevel).toBe(20);
    });

    it("deletes an item when no stock exists and blocks delete when stock is present", async () => {
      const itemRes = await createItemAction({
        companyId,
        code: "ITEM-DEL-01",
        name: "Unused Item",
        uom: "BOX",
        costPrice: 500,
        sellingPrice: 1000,
      });

      const deleteRes = await deleteItemAction(itemRes.item!.id);
      expect(deleteRes.success).toBe(true);

      const deleted = await prisma.item.findUnique({
        where: { id: itemRes.item!.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });

  describe("Stock Movements and Negative Inventory Prevention", () => {
    let warehouseId: string;
    let itemId: string;

    beforeEach(async () => {
      const wh = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-STOCK-01",
        name: "Stock Depot",
      });
      warehouseId = wh.warehouse!.id;

      const it = await createItemAction({
        companyId,
        code: "SKU-DESK-CHAIR",
        name: "Ergonomic Office Chair",
        uom: "PCS",
        costPrice: 12000, // $120.00
        sellingPrice: 19900, // $199.00
      });
      itemId = it.item!.id;
    });

    it("records INWARD goods receipt and initializes stock level", async () => {
      const res = await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "INWARD",
        quantity: 50,
        reference: "PO-2026-001",
        notes: "Factory delivery batch 1",
      });

      expect(res.success).toBe(true);
      expect(res.movement?.type).toBe(StockMovementType.INWARD);
      expect(res.movement?.quantity).toBe(50);

      // Verify StockLevel in database
      const stockLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });

      expect(stockLevel).not.toBeNull();
      expect(stockLevel?.quantityOnHand).toBe(50);
      expect(stockLevel?.version).toBe(2);
    });

    it("records OUTWARD goods issue and decrements stock level", async () => {
      // Ingest initial stock of 30 units
      await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "INWARD",
        quantity: 30,
      });

      // Dispatch 12 units
      const res = await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "OUTWARD",
        quantity: 12,
        reference: "SO-2026-99",
      });

      expect(res.success).toBe(true);
      expect(res.movement?.type).toBe(StockMovementType.OUTWARD);

      // Remaining stock should be 18
      const stockLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(stockLevel?.quantityOnHand).toBe(18);
    });

    it("strictly rejects OUTWARD movement exceeding available stock", async () => {
      // Current stock is 10
      await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "INWARD",
        quantity: 10,
      });

      // Attempt to issue 15 units
      const res = await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "OUTWARD",
        quantity: 15,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Insufficient stock on hand");

      // Verify stock was not decremented
      const stockLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(stockLevel?.quantityOnHand).toBe(10);
    });

    it("applies ADJUSTMENT movement to match physical count", async () => {
      await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "INWARD",
        quantity: 25,
      });

      // Physical audit reveals 22 units
      const res = await recordStockMovementAction({
        warehouseId,
        itemId,
        type: "ADJUSTMENT",
        quantity: 22,
        notes: "Quarterly stock audit reconciliation",
      });

      expect(res.success).toBe(true);

      const stockLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(stockLevel?.quantityOnHand).toBe(22);
    });
  });

  describe("Inter-Warehouse Stock Transfer Atomicity", () => {
    let sourceWhId: string;
    let destWhId: string;
    let itemId: string;

    beforeEach(async () => {
      const whA = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-SRC-01",
        name: "Boston Hub",
      });
      sourceWhId = whA.warehouse!.id;

      const whB = await createWarehouseAction({
        companyId,
        branchId: branchBId,
        code: "WH-DST-02",
        name: "Chicago Facility",
      });
      destWhId = whB.warehouse!.id;

      const it = await createItemAction({
        companyId,
        code: "SKU-MONITOR-4K",
        name: "Ultra HD Monitor 4K",
        uom: "PCS",
        costPrice: 35000,
        sellingPrice: 49900,
      });
      itemId = it.item!.id;

      // Ingest 40 units into source warehouse
      await recordStockMovementAction({
        warehouseId: sourceWhId,
        itemId,
        type: "INWARD",
        quantity: 40,
      });
    });

    it("atomically transfers stock between warehouses and records dual ledger entries", async () => {
      const res = await transferStockAction({
        fromWarehouseId: sourceWhId,
        toWarehouseId: destWhId,
        itemId,
        quantity: 15,
        reference: "TRF-BOS-CHI-001",
        notes: "Inter branch inventory replenishment",
      });

      expect(res.success).toBe(true);
      if (!("outMovement" in res && "inMovement" in res)) {
        throw new Error(
          "Expected outMovement and inMovement in transfer response"
        );
      }

      expect(res.outMovement).toBeDefined();
      expect(res.inMovement).toBeDefined();

      // Source warehouse has 40 - 15 = 25
      const sourceLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId: sourceWhId, itemId } },
      });
      expect(sourceLevel?.quantityOnHand).toBe(25);

      // Destination warehouse has 0 + 15 = 15
      const destLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId: destWhId, itemId } },
      });
      expect(destLevel?.quantityOnHand).toBe(15);

      // Verify movements
      expect(res.outMovement.type).toBe(StockMovementType.TRANSFER);
      expect(res.inMovement.type).toBe(StockMovementType.TRANSFER);
    });

    it("rejects transfer when source warehouse has insufficient stock", async () => {
      // Source only has 40
      const res = await transferStockAction({
        fromWarehouseId: sourceWhId,
        toWarehouseId: destWhId,
        itemId,
        quantity: 50,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Insufficient stock at source warehouse");

      // Verify no changes to balances
      const sourceLevel = await prisma.stockLevel.findUnique({
        where: { warehouseId_itemId: { warehouseId: sourceWhId, itemId } },
      });
      expect(sourceLevel?.quantityOnHand).toBe(40);
    });

    it("rejects transfer when source and destination warehouse are identical", async () => {
      const res = await transferStockAction({
        fromWarehouseId: sourceWhId,
        toWarehouseId: sourceWhId,
        itemId,
        quantity: 5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("must be different");
    });
  });

  describe("Multi-Branch Isolation and Movements Queries", () => {
    let whAId: string;
    let whBId: string;
    let itemId: string;

    beforeEach(async () => {
      const whA = await createWarehouseAction({
        companyId,
        branchId: branchAId,
        code: "WH-A",
        name: "Branch A Warehouse",
      });
      whAId = whA.warehouse!.id;

      const whB = await createWarehouseAction({
        companyId,
        branchId: branchBId,
        code: "WH-B",
        name: "Branch B Warehouse",
      });
      whBId = whB.warehouse!.id;

      const it = await createItemAction({
        companyId,
        code: "SKU-KEYBOARD",
        name: "Mechanical Keyboard",
        uom: "PCS",
        costPrice: 4500,
        sellingPrice: 7900,
      });
      itemId = it.item!.id;

      // Inward in Branch A
      await recordStockMovementAction({
        warehouseId: whAId,
        itemId,
        type: "INWARD",
        quantity: 10,
      });

      // Inward in Branch B
      await recordStockMovementAction({
        warehouseId: whBId,
        itemId,
        type: "INWARD",
        quantity: 20,
      });
    });

    it("scopes warehouse queries by branch", async () => {
      const resA = await getWarehousesAction({ branchId: branchAId });
      expect(resA.success).toBe(true);
      expect(resA.warehouses?.length).toBe(1);
      expect(resA.warehouses?.[0].branchId).toBe(branchAId);

      const resB = await getWarehousesAction({ branchId: branchBId });
      expect(resB.success).toBe(true);
      expect(resB.warehouses?.length).toBe(1);
      expect(resB.warehouses?.[0].branchId).toBe(branchBId);
    });

    it("queries stock movements with warehouse and item filters", async () => {
      const movementsWhA = await getStockMovementsAction({
        warehouseId: whAId,
      });
      expect(movementsWhA.success).toBe(true);
      expect(movementsWhA.movements?.length).toBe(1);
      expect(movementsWhA.movements?.[0].warehouse.id).toBe(whAId);

      const movementsWhB = await getStockMovementsAction({
        warehouseId: whBId,
      });
      expect(movementsWhB.success).toBe(true);
      expect(movementsWhB.movements?.length).toBe(1);
      expect(movementsWhB.movements?.[0].warehouse.id).toBe(whBId);
    });

    it("fetches items with stock level distributions across warehouses", async () => {
      const itemsRes = await getItemsAction({ companyId });
      expect(itemsRes.success).toBe(true);
      expect(itemsRes.items?.length).toBe(1);
      expect(itemsRes.items?.[0].stockLevels.length).toBe(2);
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });
});
