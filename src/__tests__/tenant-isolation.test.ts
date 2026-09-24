import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBranchPrisma } from "@/lib/branch-prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  updateSettingWithVersion,
  ConcurrencyConflictError,
} from "@/lib/concurrency";

describe("Core Multi Tenant Data Model & Isolation", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let testUserId: string;
  let testUser2Id: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.employeeTransition.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.designation.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.setting.deleteMany();
    await prisma.department.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();

    const company = await prisma.company.create({
      data: {
        name: "Acme Enterprise Corp",
        code: "ACME",
      },
    });
    companyId = company.id;

    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "North America HQ",
        code: "NA-HQ",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Asia Pacific Operations",
        code: "APAC-01",
      },
    });
    branchBId = branchB.id;

    const user1 = await prisma.user.create({
      data: {
        email: "admin@acme.corp",
        name: "Admin User",
        passwordHash: "dummy-hash-1",
      },
    });
    testUserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: "staff@acme.corp",
        name: "Staff User",
        passwordHash: "dummy-hash-2",
      },
    });
    testUser2Id = user2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-1: creates departments with hierarchical parent and child relationships", async () => {
    const parentDept = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Engineering",
        code: "ENG",
      },
    });

    const childDept = await prisma.department.create({
      data: {
        branchId: branchAId,
        parentId: parentDept.id,
        name: "Frontend Development",
        code: "ENG-FE",
      },
    });

    const fetchedParent = await prisma.department.findUnique({
      where: { id: parentDept.id },
      include: { children: true },
    });

    expect(fetchedParent).toBeDefined();
    expect(fetchedParent?.children.length).toBe(1);
    expect(fetchedParent?.children[0].id).toBe(childDept.id);
  });

  it("AC-2: branch scoped Prisma client automatically restricts queries to active branch", async () => {
    // Create department in Branch A
    await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Finance NA",
        code: "FIN-NA",
      },
    });

    // Create department in Branch B
    await prisma.department.create({
      data: {
        branchId: branchBId,
        name: "Finance APAC",
        code: "FIN-APAC",
      },
    });

    const branchAPrisma = getBranchPrisma(branchAId);
    const branchBPrisma = getBranchPrisma(branchBId);

    const deptsA = await branchAPrisma.department.findMany();
    const deptsB = await branchBPrisma.department.findMany();

    expect(deptsA.length).toBe(1);
    expect(deptsA[0].name).toBe("Finance NA");

    expect(deptsB.length).toBe(1);
    expect(deptsB[0].name).toBe("Finance APAC");
  });

  it("AC-3: soft deleted entities are automatically filtered from standard queries", async () => {
    const dept = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Temporary Dept",
        code: "TEMP",
      },
    });

    const branchAPrisma = getBranchPrisma(branchAId);

    // Initial count is 1
    const beforeCount = await branchAPrisma.department.count();
    expect(beforeCount).toBe(1);

    // Soft delete using branchPrisma delete operation
    await branchAPrisma.department.delete({
      where: { id: dept.id },
    });

    // Standard findMany should filter it out
    const afterList = await branchAPrisma.department.findMany();
    expect(afterList.length).toBe(0);

    // Raw record still exists in database with deletedAt timestamp
    const rawRecord = await prisma.department.findFirst({
      where: { id: dept.id },
    });
    expect(rawRecord).toBeDefined();
    expect(rawRecord?.deletedAt).not.toBeNull();
  });

  it("AC-4: withAuditTransaction records entity mutations with before and after state", async () => {
    const result = await withAuditTransaction(
      { userId: testUserId, branchId: branchAId },
      { action: "CREATE", entity: "Setting", entityId: "test-setting" },
      async (tx) => {
        return tx.setting.create({
          data: {
            branchId: branchAId,
            key: "fiscal_year_start",
            value: "2026-01-01",
          },
        });
      }
    );

    expect(result).toBeDefined();
    expect(result.key).toBe("fiscal_year_start");

    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: "Setting" },
    });

    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe("CREATE");
    expect(auditLogs[0].branchId).toBe(branchAId);
  });

  it("AC-5: Setting enforces optimistic concurrency via version column", async () => {
    // Initial write creates version 1
    const created = await updateSettingWithVersion(
      branchAId,
      "max_invoice_limit",
      "50000",
      1,
      { userId: testUserId, branchId: branchAId }
    );
    expect(created.version).toBe(1);

    // Second write with matching version succeeds and increments to version 2
    const updated = await updateSettingWithVersion(
      branchAId,
      "max_invoice_limit",
      "60000",
      1,
      { userId: testUserId, branchId: branchAId }
    );
    expect(updated.version).toBe(2);

    // Conflicting write with stale version throws ConcurrencyConflictError
    await expect(
      updateSettingWithVersion(
        branchAId,
        "max_invoice_limit",
        "70000",
        1, // Stale version! Current is 2
        { userId: testUser2Id, branchId: branchAId }
      )
    ).rejects.toThrow(ConcurrencyConflictError);
  });
});
