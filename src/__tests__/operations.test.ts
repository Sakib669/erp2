import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import bcrypt from "bcryptjs";
import {
  createHelpdeskTicketAction,
  updateHelpdeskTicketStatusAction,
  createBranchDocumentAction,
  getBranchDocumentsAction,
  checkInVisitorAction,
  checkOutVisitorAction,
  createVehicleReservationAction,
} from "@/actions/operations-actions";
import { TicketPriority, TicketStatus } from "@prisma/client";

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "user-op-1",
    roles: ["ADMIN"],
    permissions: ["OPERATIONS_VIEW", "OPERATIONS_MANAGE"],
  }),
  requirePermission: vi.fn().mockResolvedValue(true),
  hasBranchPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "branch-op-1" }),
  }),
}));

describe("Operations and Branch Services", () => {
  beforeEach(async () => {
    await cleanDatabase();

    await prisma.company.create({
      data: { id: "company-op-1", name: "Operations Co", code: "OPCO" },
    });
    await prisma.branch.create({
      data: {
        id: "branch-op-1",
        companyId: "company-op-1",
        name: "Main Branch",
        code: "MB1",
      },
    });
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        id: "user-op-1",
        email: "operator@example.com",
        name: "Operator",
        passwordHash: hashedPassword,
      },
    });

    const dept = await prisma.department.create({
      data: {
        id: "dept-op-1",
        branchId: "branch-op-1",
        name: "Ops",
        code: "OPS",
      },
    });
    const desig = await prisma.designation.create({
      data: {
        id: "desig-op-1",
        companyId: "company-op-1",
        title: "Officer",
        code: "OFF",
      },
    });
    await prisma.employee.create({
      data: {
        id: "emp-host-1",
        companyId: "company-op-1",
        branchId: "branch-op-1",
        departmentId: dept.id,
        designationId: desig.id,
        employeeNumber: "EMP-OP-01",
        firstName: "Host",
        lastName: "Person",
        email: "host@example.com",
        joinDate: new Date(),
        baseSalary: 400000,
        status: "ACTIVE",
      },
    });
  });

  it("should create helpdesk tickets with sequential numbering and advance status", async () => {
    const res = await createHelpdeskTicketAction({
      title: "Broken AC unit",
      description: "AC in room 204 leaking water",
      category: "MAINTENANCE",
      priority: TicketPriority.HIGH,
    });

    expect(res.success).toBe(true);
    expect(res.ticket?.ticketNumber).toBe("TKT-00001");
    expect(res.ticket?.status).toBe("OPEN");

    const updateRes = await updateHelpdeskTicketStatusAction({
      ticketId: res.ticket!.id,
      status: TicketStatus.RESOLVED,
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.ticket?.status).toBe("RESOLVED");
    expect(updateRes.ticket?.resolvedAt).toBeDefined();
  });

  it("should upload and fetch branch documents by category", async () => {
    const docRes = await createBranchDocumentAction({
      title: "Branch Safety Policy 2026",
      category: "POLICIES",
      fileUrl: "https://storage.company.com/docs/safety.pdf",
      fileType: "application/pdf",
      fileSize: 524288,
    });

    expect(docRes.success).toBe(true);
    expect(docRes.document?.title).toBe("Branch Safety Policy 2026");

    const docs = await getBranchDocumentsAction("POLICIES");
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe("Branch Safety Policy 2026");
  });

  it("should log visitor check-in and check-out", async () => {
    const checkIn = await checkInVisitorAction({
      visitorName: "Alice Guest",
      phone: "+123456789",
      hostEmployeeId: "emp-host-1",
      purpose: "Vendor Meeting",
      badgeNumber: "BADGE-12",
    });

    expect(checkIn.success).toBe(true);
    expect(checkIn.visitor?.checkOutTime).toBeNull();

    const checkOut = await checkOutVisitorAction({
      visitorLogId: checkIn.visitor!.id,
    });

    expect(checkOut.success).toBe(true);
    expect(checkOut.visitor?.checkOutTime).toBeDefined();
  });

  it("should schedule vehicle and prevent overlapping reservations", async () => {
    const start = new Date("2026-11-01T10:00:00Z");
    const end = new Date("2026-11-01T14:00:00Z");

    const res1 = await createVehicleReservationAction({
      vehiclePlate: "XYZ 9876",
      vehicleModel: "Ford Transit",
      startTime: start,
      endTime: end,
      purpose: "Deliver supplies",
    });

    expect(res1.success).toBe(true);

    // Attempt overlapping reservation
    const overlapStart = new Date("2026-11-01T12:00:00Z");
    const overlapEnd = new Date("2026-11-01T16:00:00Z");

    const res2 = await createVehicleReservationAction({
      vehiclePlate: "XYZ 9876",
      vehicleModel: "Ford Transit",
      startTime: overlapStart,
      endTime: overlapEnd,
      purpose: "Conflicting run",
    });

    expect(res2.success).toBe(false);
    expect(res2.error).toContain("already reserved");
  });
});
