import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import bcrypt from "bcryptjs";
import {
  createApprovalWorkflowAction,
  submitApprovalRequestAction,
  processApprovalAction,
} from "@/actions/approval-actions";

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "user-1",
    companyId: "company-1",
    roles: ["ADMIN"],
    permissions: ["ADMIN_WORKFLOWS"],
  }),
  requirePermission: vi.fn().mockResolvedValue(true),
  hasBranchPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "branch-1" }),
  }),
}));

describe("Enterprise Approval Workflows", () => {
  beforeEach(async () => {
    await cleanDatabase();

    await prisma.company.create({
      data: { id: "company-1", name: "Test Co", code: "TC" },
    });
    await prisma.branch.create({
      data: { id: "branch-1", companyId: "company-1", name: "HQ", code: "HQ" },
    });
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        passwordHash: hashedPassword,
      },
    });
    await prisma.role.create({
      data: { id: "manager-role", code: "MANAGER", name: "Manager" },
    });

    await prisma.supplier.create({
      data: {
        id: "supp-1",
        companyId: "company-1",
        name: "Test Supplier",
        code: "SUPP-01",
      },
    });
    await prisma.purchaseOrder.create({
      data: {
        id: "po-123",
        companyId: "company-1",
        branchId: "branch-1",
        supplierId: "supp-1",
        poNumber: "PO-001",
        orderDate: new Date(),
        status: "DRAFT",
        totalAmount: 1000,
        createdByUserId: "user-1",
      },
    });
  });

  it("should create a multi-tier approval workflow", async () => {
    const res = await createApprovalWorkflowAction({
      companyId: "company-1",
      branchId: "branch-1",
      name: "PO Approval",
      entityType: "PURCHASE_ORDER",
      isActive: true,
      steps: [
        { stepOrder: 1, requiredUserId: "user-1" },
        { stepOrder: 2, requiredRoleId: "manager-role" },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.workflow).toBeDefined();

    const wf = await prisma.approvalWorkflow.findUnique({
      where: { id: res.workflow!.id },
      include: { steps: true },
    });
    expect(wf?.steps).toHaveLength(2);
  });

  it("should submit a request and advance steps", async () => {
    await createApprovalWorkflowAction({
      companyId: "company-1",
      branchId: "branch-1",
      name: "PO Approval",
      entityType: "PURCHASE_ORDER",
      isActive: true,
      steps: [
        { stepOrder: 1, requiredUserId: "user-1" },
        { stepOrder: 2, requiredUserId: "user-1" },
      ],
    });

    // Create a dummy leave request
    const req = await submitApprovalRequestAction({
      entityType: "PURCHASE_ORDER",
      entityId: "po-123",
    });

    expect(req.success).toBe(true);
    expect(req.request?.status).toBe("PENDING");

    // Process first step
    const act1 = await processApprovalAction({
      requestId: req.request!.id,
      action: "APPROVED",
      comments: "LGTM",
    });
    expect(act1.success).toBe(true);

    const check1 = await prisma.approvalRequest.findUnique({
      where: { id: req.request!.id },
    });
    expect(check1?.status).toBe("PENDING"); // Still pending because step 2 exists

    // Process second step
    const act2 = await processApprovalAction({
      requestId: req.request!.id,
      action: "APPROVED",
    });
    expect(act2.success).toBe(true);

    const check2 = await prisma.approvalRequest.findUnique({
      where: { id: req.request!.id },
    });
    expect(check2?.status).toBe("APPROVED"); // Fully approved
  });
});
