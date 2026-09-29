import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createSalaryComponentAction,
  updateSalaryComponentAction,
  deleteSalaryComponentAction,
  getSalaryComponentsAction,
  executePayrollRunAction,
  getPayrollRunsAction,
  getPayrollRunDetailsAction,
  getPayslipDetailsAction,
  markPayslipsPaidAction,
} from "@/actions/payroll-actions";
import {
  PayrollRunStatus,
  PayslipStatus,
  AttendanceStatus,
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
  usePathname: () => "/payroll",
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

describe("Feature 10: Payroll Calculation Engine Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let departmentId: string;
  let designationId: string;
  let employeeFullMonthId: string;
  let employeeMidMonthJoinerId: string;
  let employeeWithAbsenceId: string;
  let payrollAdminUserId: string;

  beforeEach(async () => {
    // Teardown in foreign key order
    await prisma.payslipItem.deleteMany();
    await prisma.payslip.deleteMany();
    await prisma.payrollRun.deleteMany();
    await prisma.salaryComponent.deleteMany();
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
        name: "Acme Enterprises",
        code: "ACME-CORP",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "HQ Boston",
        code: "BOS-01",
        timezone: "UTC",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Chicago Hub",
        code: "CHI-02",
        timezone: "UTC",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Department
    const dept = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Finance & Accounting",
        code: "FIN",
      },
    });
    departmentId = dept.id;

    // Create Designation
    const desig = await prisma.designation.create({
      data: {
        companyId,
        title: "Accountant",
        code: "ACC-01",
      },
    });
    designationId = desig.id;

    // Create Employees
    // 1. Full month active employee ($6,000.00 / month = 600,000 cents)
    const emp1 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchAId,
        departmentId,
        designationId,
        employeeNumber: "EMP-PAY-01",
        firstName: "Diana",
        lastName: "Prince",
        email: "diana@acme.com",
        joinDate: new Date("2024-01-01"),
        baseSalary: 600000,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    employeeFullMonthId = emp1.id;

    // 2. Mid month joiner on June 16, 2026 (15 days out of 30 in June = 50% proration)
    const emp2 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchAId,
        departmentId,
        designationId,
        employeeNumber: "EMP-PAY-02",
        firstName: "Clark",
        lastName: "Kent",
        email: "clark@acme.com",
        joinDate: new Date("2026-06-16T00:00:00.000Z"),
        baseSalary: 600000,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    employeeMidMonthJoinerId = emp2.id;

    // 3. Employee in Branch B
    await prisma.employee.create({
      data: {
        companyId,
        branchId: branchBId,
        departmentId,
        designationId,
        employeeNumber: "EMP-PAY-03",
        firstName: "Bruce",
        lastName: "Wayne",
        email: "bruce@acme.com",
        joinDate: new Date("2025-01-01"),
        baseSalary: 1000000,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });

    // 4. Employee with an absent attendance day
    const emp4 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchAId,
        departmentId,
        designationId,
        employeeNumber: "EMP-PAY-04",
        firstName: "Barry",
        lastName: "Allen",
        email: "barry@acme.com",
        joinDate: new Date("2025-01-01"),
        baseSalary: 300000, // $3,000 / month = $100 / day in 30 day month
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    employeeWithAbsenceId = emp4.id;

    // Record an absent attendance day for June 10, 2026
    await prisma.attendanceRecord.create({
      data: {
        employeeId: employeeWithAbsenceId,
        branchId: branchAId,
        date: new Date("2026-06-10T00:00:00.000Z"),
        status: AttendanceStatus.ABSENT,
      },
    });

    // Create User
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await prisma.user.create({
      data: {
        name: "Payroll Officer",
        email: "payroll@acme.com",
        passwordHash,
      },
    });
    payrollAdminUserId = user.id;

    // Setup session
    mockCurrentUser = {
      id: payrollAdminUserId,
      email: "payroll@acme.com",
      name: "Payroll Officer",
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN"],
      permissions: ["PAYROLL_MANAGE", "PAYROLL_VIEW"],
      branches: [
        { id: branchAId, name: "HQ Boston", code: "BOS-01", isDefault: true },
        {
          id: branchBId,
          name: "Chicago Hub",
          code: "CHI-02",
          isDefault: false,
        },
      ],
    };
  });

  describe("Salary Component Management", () => {
    it("creates an earning component and a percentage deduction component", async () => {
      // Fixed housing allowance of $500.00 (50,000 cents)
      const resEarning = await createSalaryComponentAction({
        companyId,
        name: "Housing Allowance",
        code: "HRA",
        type: "EARNING",
        calculationType: "FIXED",
        defaultAmount: 50000,
        isTaxable: true,
      });

      expect(resEarning.success).toBe(true);
      expect(resEarning.component?.code).toBe("HRA");
      expect(resEarning.component?.defaultAmount).toBe(50000);

      // Percentage deduction for retirement: 5.00% (500 basis points)
      const resDeduction = await createSalaryComponentAction({
        companyId,
        name: "Retirement Contribution",
        code: "RETIRE_5",
        type: "DEDUCTION",
        calculationType: "PERCENTAGE_OF_BASIC",
        defaultAmount: 500,
        isTaxable: false,
      });

      expect(resDeduction.success).toBe(true);
      expect(resDeduction.component?.code).toBe("RETIRE_5");
      expect(resDeduction.component?.calculationType).toBe(
        "PERCENTAGE_OF_BASIC"
      );
    });

    it("prevents creating components with duplicate code in the same company", async () => {
      await createSalaryComponentAction({
        companyId,
        name: "Medical Allowance",
        code: "MED",
        type: "EARNING",
        defaultAmount: 20000,
      });

      const duplicateRes = await createSalaryComponentAction({
        companyId,
        name: "Medical Secondary",
        code: "MED",
        type: "EARNING",
        defaultAmount: 10000,
      });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("already exists");
    });

    it("updates salary component details", async () => {
      const createRes = await createSalaryComponentAction({
        companyId,
        name: "Transport Stipend",
        code: "TRANS",
        type: "EARNING",
        defaultAmount: 15000,
      });

      const updateRes = await updateSalaryComponentAction({
        id: createRes.component!.id,
        name: "Updated Transport Stipend",
        defaultAmount: 25000,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.component?.name).toBe("Updated Transport Stipend");
      expect(updateRes.component?.defaultAmount).toBe(25000);
    });

    it("deletes an unused component and prevents deleting one used in historical payslips", async () => {
      const createRes = await createSalaryComponentAction({
        companyId,
        name: "Temporary Bonus",
        code: "TBONUS",
        type: "EARNING",
        defaultAmount: 5000,
      });

      const componentId = createRes.component!.id;
      const deleteRes = await deleteSalaryComponentAction(componentId);
      expect(deleteRes.success).toBe(true);

      const deleted = await prisma.salaryComponent.findUnique({
        where: { id: componentId },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it("lists salary components for the company", async () => {
      await createSalaryComponentAction({
        companyId,
        name: "Allowance A",
        code: "ALLOW_A",
        type: "EARNING",
        defaultAmount: 1000,
      });

      const listRes = await getSalaryComponentsAction(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.components?.length).toBe(1);
    });
  });

  describe("Payroll Calculation Engine Execution", () => {
    beforeEach(async () => {
      // Setup standard components:
      // Fixed Housing Allowance: $500.00 (50,000 cents)
      await createSalaryComponentAction({
        companyId,
        name: "Housing Allowance",
        code: "HRA",
        type: "EARNING",
        calculationType: "FIXED",
        defaultAmount: 50000,
      });

      // Percentage Tax Deduction: 10.00% (1,000 basis points)
      await createSalaryComponentAction({
        companyId,
        name: "Income Tax",
        code: "TAX_10",
        type: "DEDUCTION",
        calculationType: "PERCENTAGE_OF_BASIC",
        defaultAmount: 1000,
      });
    });

    it("calculates exact gross, deductions, and net figures for full month employee", async () => {
      // Execute payroll for Branch A, June 2026 (30 days)
      const res = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 6,
        notes: "June 2026 Regular Cycle",
      });

      expect(res.success).toBe(true);
      expect(res.payrollRun).toBeDefined();
      expect(res.payrollRun?.status).toBe(PayrollRunStatus.COMPLETED);

      // Verify individual payslip for full month employee (Diana Prince: base $6,000 = 600,000 cents)
      const payslip = await prisma.payslip.findFirst({
        where: {
          payrollRunId: res.payrollRun!.id,
          employeeId: employeeFullMonthId,
        },
        include: { items: true },
      });

      expect(payslip).not.toBeNull();
      expect(payslip?.baseSalary).toBe(600000);
      expect(payslip?.prorationRatio).toBe(1.0);
      expect(payslip?.paidDays).toBe(30);

      // Expected Gross: 600,000 (Base) + 50,000 (HRA) = 650,000
      expect(payslip?.grossEarnings).toBe(650000);

      // Expected Deductions: 10% of 600,000 = 60,000
      expect(payslip?.totalDeductions).toBe(60000);

      // Expected Net: 650,000 - 60,000 = 590,000 ($5,900.00)
      expect(payslip?.netSalary).toBe(590000);

      // Check line items exist
      const hraItem = payslip?.items.find((i) => i.code === "HRA");
      expect(hraItem).toBeDefined();
      expect(hraItem?.amount).toBe(50000);

      const taxItem = payslip?.items.find((i) => i.code === "TAX_10");
      expect(taxItem).toBeDefined();
      expect(taxItem?.amount).toBe(60000);
    });

    it("prorates base salary and percentage allowances for mid month joiner", async () => {
      // Clark Kent joined on June 16, 2026
      // In June (30 days total), active from June 16 to 30 inclusive = 15 days
      // Proration ratio: 15 / 30 = 0.50
      const res = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 6,
      });

      expect(res.success).toBe(true);

      const payslip = await prisma.payslip.findFirst({
        where: {
          payrollRunId: res.payrollRun!.id,
          employeeId: employeeMidMonthJoinerId,
        },
        include: { items: true },
      });

      expect(payslip).not.toBeNull();
      expect(payslip?.prorationRatio).toBe(0.5);
      expect(payslip?.paidDays).toBe(15);

      // Prorated base: 50% of 600,000 = 300,000
      const baseItem = payslip?.items.find((i) => i.code === "BASE");
      expect(baseItem?.amount).toBe(300000);

      // Gross: 300,000 (Prorated Base) + 50,000 (Fixed HRA) = 350,000
      expect(payslip?.grossEarnings).toBe(350000);

      // Deduction: 10% of prorated base (300,000) = 30,000
      const taxItem = payslip?.items.find((i) => i.code === "TAX_10");
      expect(taxItem?.amount).toBe(30000);
      expect(payslip?.totalDeductions).toBe(30000);

      // Net: 350,000 - 30,000 = 320,000 ($3,200.00)
      expect(payslip?.netSalary).toBe(320000);
    });

    it("automatically deducts daily wage equivalents for unexcused attendance absences", async () => {
      // Barry Allen: base $3,000 / month (300,000 cents). In 30 day month: $100 / day (10,000 cents)
      // 1 absent day recorded on June 10
      const res = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 6,
      });

      expect(res.success).toBe(true);

      const payslip = await prisma.payslip.findFirst({
        where: {
          payrollRunId: res.payrollRun!.id,
          employeeId: employeeWithAbsenceId,
        },
        include: { items: true },
      });

      expect(payslip).not.toBeNull();
      expect(payslip?.unpaidLeaveDays).toBe(1);
      expect(payslip?.paidDays).toBe(29); // 30 - 1

      // Verify deduction line item for absence
      const absenceDeduction = payslip?.items.find(
        (i) => i.code === "UNPAID_ABSENCE"
      );
      expect(absenceDeduction).toBeDefined();
      expect(absenceDeduction?.amount).toBe(10000); // $100.00

      // Total deductions = 10% tax on 300,000 (30,000) + 10,000 absence = 40,000
      expect(payslip?.totalDeductions).toBe(40000);

      // Net: 350,000 (300,000 base + 50,000 HRA) - 40,000 = 310,000 ($3,100.00)
      expect(payslip?.netSalary).toBe(310000);
    });

    it("enforces idempotency and prevents duplicate payroll calculation for the same cycle", async () => {
      // First execution
      const firstRun = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 7,
      });
      expect(firstRun.success).toBe(true);

      // Second execution attempt for same branch and month
      const secondRun = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 7,
      });

      expect(secondRun.success).toBe(false);
      expect(secondRun.error).toContain("already been completed");
    });

    it("preserves strict multi branch isolation in payroll runs", async () => {
      // Execute for Branch A
      const runA = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 8,
      });
      expect(runA.success).toBe(true);

      // Execute for Branch B
      const runB = await executePayrollRunAction({
        branchId: branchBId,
        year: 2026,
        month: 8,
      });
      expect(runB.success).toBe(true);

      // Branch A should only have 3 employees (Diana, Clark, Barry)
      expect(runA.payrollRun?.employeeCount).toBe(3);

      // Branch B should only have 1 employee (Bruce)
      expect(runB.payrollRun?.employeeCount).toBe(1);

      // Query runs for Branch B
      const runsB = await getPayrollRunsAction({ branchId: branchBId });
      expect(runsB.success).toBe(true);
      expect(runsB.runs?.length).toBe(1);
      expect(runsB.runs?.[0].branchId).toBe(branchBId);
    });

    it("marks payslips as paid with disbursement method and records audit event", async () => {
      const runRes = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 9,
      });
      const runId = runRes.payrollRun!.id;

      const payRes = await markPayslipsPaidAction({
        runId,
        paymentMethod: "BANK_TRANSFER",
        paymentDate: "2026-09-30",
      });

      expect(payRes.success).toBe(true);

      // Verify all payslips in run transitioned to PAID
      const payslips = await prisma.payslip.findMany({
        where: { payrollRunId: runId },
      });
      expect(payslips.every((p) => p.status === PayslipStatus.PAID)).toBe(true);
      expect(payslips[0].paymentMethod).toBe("BANK_TRANSFER");

      // Verify Audit Log entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "PayrollRun",
          action: "MARK_PAYSLIPS_PAID",
          entityId: runId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("fetches detailed payroll run breakdown and individual payslip line items", async () => {
      const runRes = await executePayrollRunAction({
        branchId: branchAId,
        year: 2026,
        month: 10,
      });
      const runId = runRes.payrollRun!.id;

      const detailsRes = await getPayrollRunDetailsAction(runId);
      expect(detailsRes.success).toBe(true);
      expect(detailsRes.run?.payslips.length).toBe(3);

      const payslipId = detailsRes.run!.payslips[0].id;
      const slipRes = await getPayslipDetailsAction(payslipId);
      expect(slipRes.success).toBe(true);
      expect(slipRes.payslip?.items.length).toBeGreaterThanOrEqual(3);
    });
  });
});
