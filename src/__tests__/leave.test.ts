import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createLeaveTypeAction,
  updateLeaveTypeAction,
  deleteLeaveTypeAction,
  getLeaveTypesAction,
  allocateLeaveBalanceAction,
  getEmployeeLeaveBalancesAction,
  submitLeaveRequestAction,
  approveLeaveRequestAction,
  rejectLeaveRequestAction,
  cancelLeaveRequestAction,
  getLeaveRequestsAction,
} from "@/actions/leave-actions";
import { LeaveRequestStatus, AttendanceStatus } from "@prisma/client";

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
  usePathname: () => "/leave",
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

describe("Feature 9: Leave Management Engine Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let departmentAId: string;
  let designationId: string;
  let shiftId: string;
  let employee1Id: string;
  let employee2Id: string;
  let hrAdminUserId: string;
  let regularUserId: string;

  beforeEach(async () => {
    // Teardown in foreign key order
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveBalance.deleteMany();
    await prisma.leaveType.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.rawAttendanceLog.deleteMany();
    await prisma.employeeTransition.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.designation.deleteMany();
    await prisma.department.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();

    // Create Company
    const company = await prisma.company.create({
      data: {
        name: "Acme Industrial",
        code: "ACME-IND",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "Headquarters",
        code: "HQ-01",
        timezone: "UTC",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "North Branch",
        code: "NB-02",
        timezone: "UTC",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Department
    const dept = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Engineering",
        code: "ENG",
      },
    });
    departmentAId = dept.id;

    // Create Designation
    const desig = await prisma.designation.create({
      data: {
        companyId,
        title: "Senior Engineer",
        code: "SR-ENG",
      },
    });
    designationId = desig.id;

    // Create Shift
    const shift = await prisma.shift.create({
      data: {
        branchId: branchAId,
        name: "Day Shift",
        code: "DAY-1",
        startTime: "09:00",
        endTime: "17:00",
        gracePeriodMinutes: 15,
      },
    });
    shiftId = shift.id;

    // Create Employees
    const emp1 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        shiftId,
        employeeNumber: "EMP-001",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@acme.com",
        joinDate: new Date("2025-01-01"),
        baseSalary: 6000000,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    employee1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchBId,
        departmentId: departmentAId,
        designationId,
        shiftId,
        employeeNumber: "EMP-002",
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@acme.com",
        joinDate: new Date("2025-02-01"),
        baseSalary: 5500000,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    employee2Id = emp2.id;

    // Create Users
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const hrUser = await prisma.user.create({
      data: {
        email: "hr@acme.com",
        name: "HR Admin",
        passwordHash,
      },
    });
    hrAdminUserId = hrUser.id;

    const regularUser = await prisma.user.create({
      data: {
        email: "regular@acme.com",
        name: "Regular Staff",
        passwordHash,
      },
    });
    regularUserId = regularUser.id;

    // Setup Roles and Permissions
    const hrManagePerm = await prisma.permission.create({
      data: {
        name: "HR Manage",
        code: "HR_MANAGE",
        module: "HR",
        description: "Manage HR policies and leave",
      },
    });

    const hrViewPerm = await prisma.permission.create({
      data: {
        name: "HR View",
        code: "HR_VIEW",
        module: "HR",
        description: "View HR and attendance records",
      },
    });

    const hrRole = await prisma.role.create({
      data: {
        name: "HR Administrator",
        code: "HR_ADMIN",
        description: "Full HR access",
      },
    });

    await prisma.rolePermission.create({
      data: { roleId: hrRole.id, permissionId: hrManagePerm.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: hrRole.id, permissionId: hrViewPerm.id },
    });

    await prisma.userRole.create({
      data: { userId: hrAdminUserId, roleId: hrRole.id },
    });

    await prisma.userBranch.create({
      data: { userId: hrAdminUserId, branchId: branchAId, isDefault: true },
    });
    await prisma.userBranch.create({
      data: { userId: regularUserId, branchId: branchAId, isDefault: true },
    });

    // Default mock user to HR admin
    mockCurrentUser = {
      id: hrAdminUserId,
      email: "hr@acme.com",
      name: "HR Admin",
      activeBranchId: branchAId,
      roles: ["HR_ADMIN"],
      permissions: ["HR_MANAGE", "HR_VIEW"],
      branches: [
        { id: branchAId, name: "Headquarters", code: "HQ-01", isDefault: true },
      ],
    };
  });

  describe("Leave Type Policy CRUD", () => {
    it("creates a leave category with allowances and carry over rules", async () => {
      const res = await createLeaveTypeAction({
        companyId,
        name: "Annual Leave",
        code: "AL",
        description: "Standard paid vacation days",
        defaultDaysPerYear: 14,
        isPaid: true,
        requiresApproval: true,
        carryForwardMaxDays: 5,
      });

      expect(res.success).toBe(true);
      expect(res.leaveType).toBeDefined();
      expect(res.leaveType?.name).toBe("Annual Leave");
      expect(res.leaveType?.code).toBe("AL");
      expect(res.leaveType?.defaultDaysPerYear).toBe(14);
      expect(res.leaveType?.carryForwardMaxDays).toBe(5);

      // Verify audit log created
      const audit = await prisma.auditLog.findFirst({
        where: { entity: "LeaveType", action: "CREATE" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(hrAdminUserId);
    });

    it("lists leave categories for the company", async () => {
      await createLeaveTypeAction({
        companyId,
        name: "Annual Leave",
        code: "AL",
        defaultDaysPerYear: 14,
      });

      const listRes = await getLeaveTypesAction(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.leaveTypes?.length).toBe(1);
      expect(listRes.leaveTypes?.[0].code).toBe("AL");
    });

    it("rejects duplicate leave codes for the same company", async () => {
      await createLeaveTypeAction({
        companyId,
        name: "Annual Leave",
        code: "AL",
        defaultDaysPerYear: 14,
      });

      const duplicateRes = await createLeaveTypeAction({
        companyId,
        name: "Alternate Leave",
        code: "AL",
        defaultDaysPerYear: 10,
      });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("already exists");
    });

    it("updates leave category parameters", async () => {
      const createRes = await createLeaveTypeAction({
        companyId,
        name: "Casual Leave",
        code: "CL",
        defaultDaysPerYear: 10,
      });

      const updatedRes = await updateLeaveTypeAction({
        id: createRes.leaveType!.id,
        name: "Casual Leave Updated",
        defaultDaysPerYear: 12,
        carryForwardMaxDays: 3,
      });

      expect(updatedRes.success).toBe(true);
      expect(updatedRes.leaveType?.name).toBe("Casual Leave Updated");
      expect(updatedRes.leaveType?.defaultDaysPerYear).toBe(12);
      expect(updatedRes.leaveType?.carryForwardMaxDays).toBe(3);
    });

    it("deletes a leave category if unused and prevents deletion if active balances exist", async () => {
      const createRes = await createLeaveTypeAction({
        companyId,
        name: "Paternity Leave",
        code: "PL",
        defaultDaysPerYear: 5,
      });

      const leaveTypeId = createRes.leaveType!.id;

      // When no balances exist, deletion succeeds
      const deleteRes = await deleteLeaveTypeAction(leaveTypeId);
      expect(deleteRes.success).toBe(true);

      const deletedType = await prisma.leaveType.findUnique({
        where: { id: leaveTypeId },
      });
      expect(deletedType?.deletedAt).not.toBeNull();

      // Create another leave type and assign usage
      const newTypeRes = await createLeaveTypeAction({
        companyId,
        name: "Maternity Leave",
        code: "ML",
        defaultDaysPerYear: 90,
      });
      const mlId = newTypeRes.leaveType!.id;

      await prisma.leaveBalance.create({
        data: {
          employeeId: employee1Id,
          leaveTypeId: mlId,
          year: 2026,
          entitledDays: 90,
          usedDays: 5,
        },
      });

      const failedDeleteRes = await deleteLeaveTypeAction(mlId);
      expect(failedDeleteRes.success).toBe(false);
      expect(failedDeleteRes.error).toContain("Cannot delete leave category");
    });
  });

  describe("Leave Balances and Calculations", () => {
    it("allocates leave balance for an employee", async () => {
      const typeRes = await createLeaveTypeAction({
        companyId,
        name: "Sick Leave",
        code: "SL",
        defaultDaysPerYear: 10,
      });
      const leaveTypeId = typeRes.leaveType!.id;

      const allocRes = await allocateLeaveBalanceAction({
        employeeId: employee1Id,
        leaveTypeId,
        year: 2026,
        entitledDays: 12,
        carriedForwardDays: 2,
      });

      expect(allocRes.success).toBe(true);
      expect(allocRes.balance?.entitledDays).toBe(12);
      expect(allocRes.balance?.carriedForwardDays).toBe(2);

      const balancesRes = await getEmployeeLeaveBalancesAction(
        employee1Id,
        2026
      );
      expect(balancesRes.success).toBe(true);
      const slBalance = balancesRes.balances?.find(
        (b) => b.leaveTypeId === leaveTypeId
      );
      expect(slBalance).toBeDefined();
      expect(slBalance?.availableDays).toBe(14); // 12 + 2 - (0 + 0)
    });
  });

  describe("Leave Request Submission and Approval Engine", () => {
    let annualLeaveTypeId: string;

    beforeEach(async () => {
      const typeRes = await createLeaveTypeAction({
        companyId,
        name: "Annual Leave",
        code: "AL",
        defaultDaysPerYear: 14,
        isPaid: true,
        requiresApproval: true,
      });
      annualLeaveTypeId = typeRes.leaveType!.id;

      // Allocate 14 days to employee1
      await allocateLeaveBalanceAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        year: 2026,
        entitledDays: 14,
        carriedForwardDays: 0,
      });
    });

    it("locks requested days into pendingDays upon submission", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-10-05",
        endDate: "2026-10-07",
        daysCount: 3,
        reason: "Family vacation trip",
      });

      expect(submitRes.success).toBe(true);
      expect(submitRes.request).toBeDefined();
      expect(submitRes.request?.status).toBe(LeaveRequestStatus.PENDING);
      expect(submitRes.request?.daysCount).toBe(3);

      // Verify pendingDays incremented
      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.pendingDays).toBe(3);
      expect(balance?.usedDays).toBe(0);

      // Verify available days calculation
      const balancesRes = await getEmployeeLeaveBalancesAction(
        employee1Id,
        2026
      );
      const b = balancesRes.balances?.find(
        (x) => x.leaveTypeId === annualLeaveTypeId
      );
      expect(b?.availableDays).toBe(11); // 14 - 3 pending = 11
    });

    it("rejects leave request when days exceed available balance", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-10-01",
        endDate: "2026-10-25",
        daysCount: 20, // Only 14 entitled
        reason: "Extended holiday request",
      });

      expect(submitRes.success).toBe(false);
      expect(submitRes.error).toContain("Insufficient leave balance");
    });

    it("approving request converts pendingDays to usedDays and synchronizes AttendanceRecord as ON_LEAVE", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-10-12",
        endDate: "2026-10-13",
        daysCount: 2,
        reason: "Doctor consultation and recovery",
      });

      const requestId = submitRes.request!.id;

      const approveRes = await approveLeaveRequestAction({
        id: requestId,
        approvalNotes: "Approved by HR manager",
      });

      expect(approveRes.success).toBe(true);

      // Verify balance transitioned pending to used
      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.pendingDays).toBe(0);
      expect(balance?.usedDays).toBe(2);

      // Verify attendance records synchronized with status ON_LEAVE
      const attendanceDay1 = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee1Id,
          date: new Date("2026-10-12T00:00:00.000Z"),
        },
      });
      expect(attendanceDay1).not.toBeNull();
      expect(attendanceDay1?.status).toBe(AttendanceStatus.ON_LEAVE);
      expect(attendanceDay1?.branchId).toBe(branchAId);

      const attendanceDay2 = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee1Id,
          date: new Date("2026-10-13T00:00:00.000Z"),
        },
      });
      expect(attendanceDay2).not.toBeNull();
      expect(attendanceDay2?.status).toBe(AttendanceStatus.ON_LEAVE);

      // Verify Audit Log entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "LeaveRequest",
          action: "APPROVE_LEAVE_REQUEST",
          entityId: requestId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("rejecting request restores pendingDays back to available balance", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        daysCount: 2,
        reason: "Personal errands",
      });

      const requestId = submitRes.request!.id;

      const rejectRes = await rejectLeaveRequestAction({
        id: requestId,
        rejectionReason: "Critical project release milestone period",
      });

      expect(rejectRes.success).toBe(true);

      // Verify balance restored
      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.pendingDays).toBe(0);
      expect(balance?.usedDays).toBe(0);

      // Verify request state
      const req = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
      });
      expect(req?.status).toBe(LeaveRequestStatus.REJECTED);
      expect(req?.rejectionReason).toBe(
        "Critical project release milestone period"
      );
    });

    it("cancelling a pending request releases locked days", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-12-01",
        endDate: "2026-12-03",
        daysCount: 3,
        reason: "Winter break",
      });

      const requestId = submitRes.request!.id;

      const cancelRes = await cancelLeaveRequestAction(requestId);
      expect(cancelRes.success).toBe(true);

      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.pendingDays).toBe(0);

      const req = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
      });
      expect(req?.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it("cancelling an approved request reverses used days count", async () => {
      const submitRes = await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: annualLeaveTypeId,
        startDate: "2026-12-10",
        endDate: "2026-12-11",
        daysCount: 2,
        reason: "Conference attendance",
      });

      const requestId = submitRes.request!.id;
      await approveLeaveRequestAction({ id: requestId });

      let balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.usedDays).toBe(2);

      const cancelRes = await cancelLeaveRequestAction(requestId);
      expect(cancelRes.success).toBe(true);

      balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: employee1Id,
          leaveTypeId: annualLeaveTypeId,
          year: 2026,
        },
      });
      expect(balance?.usedDays).toBe(0);

      const req = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
      });
      expect(req?.status).toBe(LeaveRequestStatus.CANCELLED);
    });
  });

  describe("Multi-Branch Leave Request Queries", () => {
    it("respects branch boundaries in leave queries", async () => {
      const typeRes = await createLeaveTypeAction({
        companyId,
        name: "Casual Leave",
        code: "CL",
        defaultDaysPerYear: 10,
      });

      // Employee 1 in Branch A
      await submitLeaveRequestAction({
        employeeId: employee1Id,
        leaveTypeId: typeRes.leaveType!.id,
        startDate: "2026-10-01",
        endDate: "2026-10-02",
        daysCount: 2,
        reason: "Branch A leave",
      });

      // Employee 2 in Branch B
      await submitLeaveRequestAction({
        employeeId: employee2Id,
        leaveTypeId: typeRes.leaveType!.id,
        startDate: "2026-10-01",
        endDate: "2026-10-02",
        daysCount: 2,
        reason: "Branch B leave",
      });

      // Query as Branch A user
      const branchARequests = await getLeaveRequestsAction({
        branchId: branchAId,
      });
      expect(branchARequests.success).toBe(true);
      expect(branchARequests.requests?.length).toBe(1);
      expect(branchARequests.requests?.[0].employee.employeeNumber).toBe(
        "EMP-001"
      );

      // Query as Branch B
      const branchBRequests = await getLeaveRequestsAction({
        branchId: branchBId,
      });
      expect(branchBRequests.success).toBe(true);
      expect(branchBRequests.requests?.length).toBe(1);
      expect(branchBRequests.requests?.[0].employee.employeeNumber).toBe(
        "EMP-002"
      );
    });
  });
});
