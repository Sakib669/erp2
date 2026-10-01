import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import {
  createDesignationAction,
  updateDesignationAction,
  deleteDesignationAction,
  createShiftAction,
  updateShiftAction,
  deleteShiftAction,
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  recordEmployeeTransitionAction,
  getEmployeesAction,
  getEmployeeByIdAction,
} from "@/actions/hr-actions";

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
  usePathname: () => "/hr",
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

describe("Feature 7: HR Core and Employee Lifecycle Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let departmentAId: string;
  let departmentBId: string;
  let adminUserId: string;

  beforeEach(async () => {
    // Clean tables in foreign key dependency order
    await cleanDatabase();

    // Create Base Company
    const company = await prisma.company.create({
      data: {
        name: "Acme Enterprises",
        code: "ACME-HR",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "New York Headquarters",
        code: "HQ-NY",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "London Operations",
        code: "OPS-LDN",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Departments
    const deptA = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Engineering",
        code: "ENG-NY",
      },
    });
    departmentAId = deptA.id;

    const deptB = await prisma.department.create({
      data: {
        branchId: branchBId,
        name: "Operations",
        code: "OPS-LDN-DEPT",
      },
    });
    departmentBId = deptB.id;

    // Create Admin User
    const admin = await prisma.user.create({
      data: {
        name: "HR Director",
        email: "hr.director@acme.com",
        passwordHash: await bcrypt.hash("Password123!", 10),
        status: "ACTIVE",
        activeBranchId: branchAId,
      },
    });
    adminUserId = admin.id;

    // Set Mock Current User
    mockCurrentUser = {
      id: adminUserId,
      email: admin.email,
      name: admin.name,
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN"],
      permissions: ["HR_VIEW", "HR_MANAGE"],
      branches: [
        {
          id: branchAId,
          name: "New York Headquarters",
          code: "HQ-NY",
          isDefault: true,
        },
        {
          id: branchBId,
          name: "London Operations",
          code: "OPS-LDN",
          isDefault: false,
        },
      ],
    };
  });

  // -------------------------------------------------------------
  // Designation Tests
  // -------------------------------------------------------------
  describe("Designation Management", () => {
    it("creates a designation with valid code and title", async () => {
      const res = await createDesignationAction({
        companyId,
        title: "Software Engineer",
        code: "SWE-01",
        description: "Core platform engineer",
      });

      expect(res.success).toBe(true);
      expect(res.designation?.title).toBe("Software Engineer");
      expect(res.designation?.code).toBe("SWE-01");

      const saved = await prisma.designation.findUnique({
        where: { id: res.designation?.id },
      });
      expect(saved).not.toBeNull();
      expect(saved?.code).toBe("SWE-01");
    });

    it("enforces unique designation code per company", async () => {
      await createDesignationAction({
        companyId,
        title: "Software Engineer",
        code: "SWE-01",
      });

      const duplicateRes = await createDesignationAction({
        companyId,
        title: "Senior Software Engineer",
        code: "SWE-01",
      });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("already exists");
    });

    it("updates designation details successfully", async () => {
      const created = await createDesignationAction({
        companyId,
        title: "Product Designer",
        code: "DSG-01",
      });

      const updated = await updateDesignationAction({
        id: created.designation!.id,
        title: "Lead Product Designer",
        code: "DSG-02",
        description: "Design systems leader",
      });

      expect(updated.success).toBe(true);
      expect(updated.designation?.title).toBe("Lead Product Designer");
      expect(updated.designation?.code).toBe("DSG-02");
    });

    it("soft deletes a designation when no active employees are assigned", async () => {
      const created = await createDesignationAction({
        companyId,
        title: "Quality Assurance",
        code: "QA-01",
      });

      const deleteRes = await deleteDesignationAction(created.designation!.id);
      expect(deleteRes.success).toBe(true);

      const archived = await prisma.designation.findUnique({
        where: { id: created.designation!.id },
      });
      expect(archived?.deletedAt).not.toBeNull();
    });
  });

  // -------------------------------------------------------------
  // Shift Tests
  // -------------------------------------------------------------
  describe("Work Shift Management", () => {
    it("creates a work shift scoped to branch", async () => {
      const res = await createShiftAction({
        branchId: branchAId,
        name: "Morning Shift",
        code: "MORN-01",
        startTime: "08:00",
        endTime: "16:00",
        gracePeriodMinutes: 15,
      });

      expect(res.success).toBe(true);
      expect(res.shift?.name).toBe("Morning Shift");
      expect(res.shift?.branchId).toBe(branchAId);
    });

    it("prevents duplicate shift code in the same branch", async () => {
      await createShiftAction({
        branchId: branchAId,
        name: "Day Shift",
        code: "DAY-01",
        startTime: "09:00",
        endTime: "17:00",
        gracePeriodMinutes: 15,
      });

      const dup = await createShiftAction({
        branchId: branchAId,
        name: "Duplicate Day Shift",
        code: "DAY-01",
        startTime: "09:00",
        endTime: "17:00",
        gracePeriodMinutes: 10,
      });

      expect(dup.success).toBe(false);
      expect(dup.error).toContain("already exists");
    });

    it("soft deletes an unassigned work shift", async () => {
      const created = await createShiftAction({
        branchId: branchAId,
        name: "Night Shift",
        code: "NIGHT-01",
        startTime: "22:00",
        endTime: "06:00",
        gracePeriodMinutes: 30,
      });

      const deleteRes = await deleteShiftAction(created.shift!.id);
      expect(deleteRes.success).toBe(true);

      const archived = await prisma.shift.findUnique({
        where: { id: created.shift!.id },
      });
      expect(archived?.deletedAt).not.toBeNull();
    });

    it("updates work shift details successfully", async () => {
      const created = await createShiftAction({
        branchId: branchAId,
        name: "Early Shift",
        code: "EARLY-01",
        startTime: "07:00",
        endTime: "15:00",
        gracePeriodMinutes: 10,
      });

      const updated = await updateShiftAction({
        id: created.shift!.id,
        name: "Early Morning Shift",
        startTime: "06:30",
        endTime: "14:30",
        gracePeriodMinutes: 15,
      });

      expect(updated.success).toBe(true);
      expect(updated.shift?.name).toBe("Early Morning Shift");
      expect(updated.shift?.startTime).toBe("06:30");
      expect(updated.shift?.gracePeriodMinutes).toBe(15);
    });
  });

  // -------------------------------------------------------------
  // Employee Enrollment & Lifecycle Tests
  // -------------------------------------------------------------
  describe("Employee Enrollment and Career Transitions", () => {
    let designationId: string;
    let shiftId: string;

    beforeEach(async () => {
      const desig = await prisma.designation.create({
        data: {
          companyId,
          title: "Staff Engineer",
          code: "ENG-STF",
        },
      });
      designationId = desig.id;

      const shift = await prisma.shift.create({
        data: {
          branchId: branchAId,
          name: "Standard Day Shift",
          code: "STD-DAY",
          startTime: "09:00",
          endTime: "17:00",
          gracePeriodMinutes: 15,
        },
      });
      shiftId = shift.id;
    });

    it("enrolls employee and automatically generates initial HIRED transition", async () => {
      const res = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        shiftId,
        employeeNumber: "EMP-1001",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada.lovelace@acme.com",
        phone: "+1-555-0101",
        joinDate: "2026-01-15",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
        baseSalary: 12500000, // $125,000.00 stored in cents
        bankName: "Chase Bank",
        bankAccount: "9876543210",
      });

      expect(res.success).toBe(true);
      expect(res.employee?.employeeNumber).toBe("EMP-1001");
      expect(res.employee?.baseSalary).toBe(12500000);

      // Verify initial career transition
      const transitions = await prisma.employeeTransition.findMany({
        where: { employeeId: res.employee?.id },
      });
      expect(transitions).toHaveLength(1);
      expect(transitions[0].transitionType).toBe("HIRED");
      expect(transitions[0].newSalary).toBe(12500000);
      expect(transitions[0].toBranchId).toBe(branchAId);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Employee",
          entityId: res.employee?.id,
          action: "CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(adminUserId);
    });

    it("prevents duplicate employee numbers or emails", async () => {
      await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-2001",
        firstName: "Alan",
        lastName: "Turing",
        email: "alan.turing@acme.com",
        joinDate: "2026-02-01",
        baseSalary: 13000000,
      });

      // Duplicate employee number
      const dupNum = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-2001",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace.hopper@acme.com",
        joinDate: "2026-02-01",
        baseSalary: 14000000,
      });
      expect(dupNum.success).toBe(false);
      expect(dupNum.error).toContain("Employee number");

      // Duplicate email
      const dupEmail = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-2002",
        firstName: "Alan",
        lastName: "Duplicate",
        email: "alan.turing@acme.com",
        joinDate: "2026-02-01",
        baseSalary: 13000000,
      });
      expect(dupEmail.success).toBe(false);
      expect(dupEmail.error).toContain("email");
    });

    it("prevents deleting designation or shift when active employee is assigned", async () => {
      const empRes = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        shiftId,
        employeeNumber: "EMP-3001",
        firstName: "Margaret",
        lastName: "Hamilton",
        email: "margaret.hamilton@acme.com",
        joinDate: "2026-03-01",
        baseSalary: 15000000,
      });

      expect(empRes.success).toBe(true);

      // Attempt to delete assigned designation
      const deleteDesig = await deleteDesignationAction(designationId);
      expect(deleteDesig.success).toBe(false);
      expect(deleteDesig.error).toContain(
        "Cannot delete designation assigned to"
      );

      // Attempt to delete assigned shift
      const deleteShift = await deleteShiftAction(shiftId);
      expect(deleteShift.success).toBe(false);
      expect(deleteShift.error).toContain("Cannot delete shift assigned to");
    });

    it("records promotion transition and updates employee attributes", async () => {
      const empRes = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-4001",
        firstName: "Katherine",
        lastName: "Johnson",
        email: "katherine.johnson@acme.com",
        joinDate: "2026-01-01",
        baseSalary: 10000000, // $100,000.00
      });

      const newDesig = await prisma.designation.create({
        data: {
          companyId,
          title: "Principal Engineer",
          code: "ENG-PRIN",
        },
      });

      const transRes = await recordEmployeeTransitionAction({
        employeeId: empRes.employee!.id,
        transitionType: "PROMOTION",
        effectiveDate: "2026-06-01",
        toDesignationId: newDesig.id,
        newSalary: 13000000, // $130,000.00
        remarks:
          "Promoted to Principal Engineer based on stellar contributions",
      });

      expect(transRes.success).toBe(true);
      expect(transRes.transition?.transitionType).toBe("PROMOTION");
      expect(transRes.transition?.previousSalary).toBe(10000000);
      expect(transRes.transition?.newSalary).toBe(13000000);
      expect(transRes.transition?.fromDesignationId).toBe(designationId);
      expect(transRes.transition?.toDesignationId).toBe(newDesig.id);

      // Verify updated employee record
      const updatedEmp = await prisma.employee.findUnique({
        where: { id: empRes.employee!.id },
      });
      expect(updatedEmp?.designationId).toBe(newDesig.id);
      expect(updatedEmp?.baseSalary).toBe(13000000);
    });

    it("records physical branch transfer and department reassignment", async () => {
      const empRes = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-5001",
        firstName: "Claude",
        lastName: "Shannon",
        email: "claude.shannon@acme.com",
        joinDate: "2026-01-01",
        baseSalary: 11000000,
      });

      const transRes = await recordEmployeeTransitionAction({
        employeeId: empRes.employee!.id,
        transitionType: "TRANSFER",
        effectiveDate: "2026-07-01",
        toBranchId: branchBId,
        toDepartmentId: departmentBId,
        remarks: "Relocating to London Operations headquarters",
      });

      expect(transRes.success).toBe(true);
      expect(transRes.transition?.fromBranchId).toBe(branchAId);
      expect(transRes.transition?.toBranchId).toBe(branchBId);
      expect(transRes.transition?.fromDepartmentId).toBe(departmentAId);
      expect(transRes.transition?.toDepartmentId).toBe(departmentBId);

      // Verify updated employee record
      const updatedEmp = await prisma.employee.findUnique({
        where: { id: empRes.employee!.id },
      });
      expect(updatedEmp?.branchId).toBe(branchBId);
      expect(updatedEmp?.departmentId).toBe(departmentBId);
    });

    it("soft deletes an employee and marks status as TERMINATED", async () => {
      const empRes = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-6001",
        firstName: "John",
        lastName: "von Neumann",
        email: "john.vonneumann@acme.com",
        joinDate: "2026-01-01",
        baseSalary: 12000000,
      });

      const deleteRes = await deleteEmployeeAction(empRes.employee!.id);
      expect(deleteRes.success).toBe(true);

      const archived = await prisma.employee.findUnique({
        where: { id: empRes.employee!.id },
      });
      expect(archived?.deletedAt).not.toBeNull();
      expect(archived?.status).toBe("TERMINATED");

      // Verify transitions history is still preserved
      const transitions = await prisma.employeeTransition.findMany({
        where: { employeeId: empRes.employee!.id },
      });
      expect(transitions.length).toBeGreaterThan(0);
    });

    it("filters staff directory by branch isolation correctly", async () => {
      // Create employee in Branch A
      await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-7001",
        firstName: "Alice",
        lastName: "Smith",
        email: "alice.smith@acme.com",
        joinDate: "2026-01-01",
        baseSalary: 9000000,
      });

      // Create employee in Branch B
      await createEmployeeAction({
        companyId,
        branchId: branchBId,
        departmentId: departmentBId,
        designationId,
        employeeNumber: "EMP-7002",
        firstName: "Bob",
        lastName: "Jones",
        email: "bob.jones@acme.com",
        joinDate: "2026-01-01",
        baseSalary: 9500000,
      });

      // Query Branch A only
      const branchARes = await getEmployeesAction({ branchId: branchAId });
      expect(branchARes.success).toBe(true);
      expect(branchARes.employees?.length).toBe(1);
      expect(branchARes.employees?.[0].firstName).toBe("Alice");

      // Query Branch B only
      const branchBRes = await getEmployeesAction({ branchId: branchBId });
      expect(branchBRes.success).toBe(true);
      expect(branchBRes.employees?.length).toBe(1);
      expect(branchBRes.employees?.[0].firstName).toBe("Bob");
    });

    it("updates employee details and fetches complete profile with transitions", async () => {
      const empRes = await createEmployeeAction({
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        employeeNumber: "EMP-8001",
        firstName: "Dorothy",
        lastName: "Vaughan",
        email: "dorothy.vaughan@acme.com",
        phone: "+1-555-0801",
        joinDate: "2026-01-01",
        baseSalary: 11500000,
      });

      expect(empRes.success).toBe(true);
      const empId = empRes.employee!.id;

      const updateRes = await updateEmployeeAction({
        id: empId,
        phone: "+1-555-0999",
        baseSalary: 12500000,
        bankName: "First National Bank",
        bankAccount: "ACCT-888999",
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.employee?.phone).toBe("+1-555-0999");
      expect(updateRes.employee?.baseSalary).toBe(12500000);

      const profileRes = await getEmployeeByIdAction(empId);
      expect(profileRes.success).toBe(true);
      expect(profileRes.employee?.id).toBe(empId);
      expect(profileRes.employee?.branch.name).toBe("New York Headquarters");
      expect(profileRes.employee?.transitions.length).toBeGreaterThanOrEqual(1);
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });
});
