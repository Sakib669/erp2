import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import bcrypt from "bcryptjs";
import {
  getExecutiveMetricsAction,
  generateDynamicReportAction,
  exportReportToCsvAction,
} from "@/actions/reporting-actions";

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "user-rep-1",
    roles: ["ADMIN"],
    permissions: ["REPORTS_VIEW"],
  }),
  requirePermission: vi.fn().mockResolvedValue(true),
  hasBranchPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "branch-rep-1" }),
  }),
}));

describe("Management Dashboard and Dynamic Reporting", () => {
  beforeEach(async () => {
    await cleanDatabase();

    await prisma.company.create({
      data: { id: "company-rep-1", name: "Reporting Co", code: "REPCO" },
    });
    await prisma.branch.create({
      data: {
        id: "branch-rep-1",
        companyId: "company-rep-1",
        name: "Finance Branch",
        code: "FB1",
      },
    });
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        id: "user-rep-1",
        email: "analyst@example.com",
        name: "Analyst",
        passwordHash: hashedPassword,
      },
    });

    const dept = await prisma.department.create({
      data: {
        id: "dept-rep-1",
        branchId: "branch-rep-1",
        name: "Finance",
        code: "FIN",
      },
    });
    const desig = await prisma.designation.create({
      data: {
        id: "desig-rep-1",
        companyId: "company-rep-1",
        title: "CFO",
        code: "CFO",
      },
    });

    await prisma.employee.create({
      data: {
        id: "emp-rep-1",
        companyId: "company-rep-1",
        branchId: "branch-rep-1",
        departmentId: dept.id,
        designationId: desig.id,
        employeeNumber: "EMP-FIN-01",
        firstName: "Chief",
        lastName: "Financial",
        email: "cfo@example.com",
        joinDate: new Date(),
        baseSalary: 1200000,
        status: "ACTIVE",
      },
    });

    // Accounting setup for P&L test
    const revAccount = await prisma.account.create({
      data: {
        id: "acc-rev-1",
        companyId: "company-rep-1",
        name: "Sales Revenue",
        code: "4001",
        type: "REVENUE",
      },
    });

    const expAccount = await prisma.account.create({
      data: {
        id: "acc-exp-1",
        companyId: "company-rep-1",
        name: "Office Expense",
        code: "5001",
        type: "EXPENSE",
      },
    });

    await prisma.journalEntry.create({
      data: {
        id: "je-rep-1",
        companyId: "company-rep-1",
        branchId: "branch-rep-1",
        entryNumber: "JE-001",
        entryDate: new Date(),
        description: "Test journal entry",
        status: "POSTED",
        postedByUserId: "user-rep-1",
        lines: {
          create: [
            { accountId: revAccount.id, type: "CREDIT", amount: 100000 },
            { accountId: expAccount.id, type: "DEBIT", amount: 35000 },
          ],
        },
      },
    });

    // Inventory setup
    const category = await prisma.itemCategory.create({
      data: {
        id: "cat-rep-1",
        companyId: "company-rep-1",
        name: "Supplies",
        code: "SUPP",
      },
    });
    const item = await prisma.item.create({
      data: {
        id: "item-rep-1",
        companyId: "company-rep-1",
        categoryId: category.id,
        name: "Printer Paper",
        code: "PAP-01",
        uom: "BOX",
        costPrice: 2000,
        sellingPrice: 3500,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        id: "wh-rep-1",
        companyId: "company-rep-1",
        branchId: "branch-rep-1",
        name: "Central Store",
        code: "WH-CS",
      },
    });
    await prisma.stockLevel.create({
      data: {
        id: "sl-rep-1",
        itemId: item.id,
        warehouseId: warehouse.id,
        quantityOnHand: 50,
      },
    });
  });

  it("should calculate executive metrics correctly", async () => {
    const res = await getExecutiveMetricsAction();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    expect(res.data!.revenue).toBe(100000);
    expect(res.data!.expenses).toBe(35000);
    expect(res.data!.netProfit).toBe(65000);
    expect(res.data!.headcount).toBe(1);
    expect(res.data!.stockValuation).toBe(100000); // 50 * 2000 cents
  });

  it("should generate Profit and Loss report", async () => {
    const res = await generateDynamicReportAction({
      reportType: "PROFIT_AND_LOSS",
    });

    expect(res.success).toBe(true);
    expect(res.data?.title).toBe("Profit and Loss Statement");
    expect(res.data?.rows).toHaveLength(2);
    expect(res.data?.summary?.["Net Income ($)"]).toBe("650.00");
  });

  it("should generate Stock Valuation report and export to CSV", async () => {
    const res = await generateDynamicReportAction({
      reportType: "STOCK_VALUATION",
    });

    expect(res.success).toBe(true);
    expect(res.data?.title).toBe("Inventory Stock Valuation");
    expect(res.data?.rows).toHaveLength(1);
    expect(res.data?.rows[0].name).toBe("Printer Paper");
    expect(res.data?.rows[0].quantity).toBe(50);

    const csvRes = await exportReportToCsvAction({
      reportType: "STOCK_VALUATION",
    });

    expect(csvRes.success).toBe(true);
    expect(csvRes.csv).toContain('"Item Code","Item Name"');
    expect(csvRes.csv).toContain('"PAP-01","Printer Paper"');
  });
});
