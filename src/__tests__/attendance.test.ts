import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import {
  ingestRawPunchesAction,
  processRawAttendancePunchesAction,
  manualAttendanceCorrectionAction,
  getDailyAttendanceAction,
  getRawAttendanceLogsAction,
} from "@/actions/attendance-actions";

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
  usePathname: () => "/attendance",
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

describe("Feature 8: Biometric Attendance and Ingestion Queue Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let departmentAId: string;
  let designationId: string;
  let shiftId: string;
  let employee1Id: string;
  let employee2Id: string;
  let supervisorUserId: string;

  const testDate = "2026-09-25";

  beforeEach(async () => {
    // Teardown in foreign key order
    await cleanDatabase();

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
        name: "Boston Plant",
        code: "BOS-01",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Chicago Facility",
        code: "CHI-01",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Department
    const dept = await prisma.department.create({
      data: {
        branchId: branchAId,
        name: "Manufacturing",
        code: "MFG-BOS",
      },
    });
    departmentAId = dept.id;

    // Create Designation
    const desig = await prisma.designation.create({
      data: {
        companyId,
        title: "Assembly Operator",
        code: "ASM-OP",
      },
    });
    designationId = desig.id;

    // Create Shift (09:00 to 17:00, 15m grace)
    const shift = await prisma.shift.create({
      data: {
        branchId: branchAId,
        name: "Standard Manufacturing Shift",
        code: "STD-MFG",
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
        employeeNumber: "EMP-100",
        firstName: "Marcus",
        lastName: "Aurelius",
        email: "marcus@acme.com",
        joinDate: new Date("2026-01-01"),
        baseSalary: 6000000,
        status: "ACTIVE",
        employmentType: "FULL_TIME",
      },
    });
    employee1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        companyId,
        branchId: branchAId,
        departmentId: departmentAId,
        designationId,
        shiftId,
        employeeNumber: "EMP-200",
        firstName: "Lucius",
        lastName: "Verus",
        email: "lucius@acme.com",
        joinDate: new Date("2026-01-01"),
        baseSalary: 6000000,
        status: "ACTIVE",
        employmentType: "FULL_TIME",
      },
    });
    employee2Id = emp2.id;

    // Create Supervisor User
    const supervisor = await prisma.user.create({
      data: {
        name: "Shift Supervisor",
        email: "supervisor@acme.com",
        passwordHash: await bcrypt.hash("Password123!", 10),
        status: "ACTIVE",
        activeBranchId: branchAId,
      },
    });
    supervisorUserId = supervisor.id;

    mockCurrentUser = {
      id: supervisorUserId,
      email: supervisor.email,
      name: supervisor.name,
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN"],
      permissions: ["HR_VIEW", "HR_MANAGE"],
      branches: [
        {
          id: branchAId,
          name: "Boston Plant",
          code: "BOS-01",
          isDefault: true,
        },
        {
          id: branchBId,
          name: "Chicago Facility",
          code: "CHI-01",
          isDefault: false,
        },
      ],
    };
  });

  // -------------------------------------------------------------
  // Raw Punch Ingestion & Deduplication (AC-1, AC-2)
  // -------------------------------------------------------------
  describe("Biometric Ingestion and Deduplication", () => {
    it("ingests punch events and drops exact duplicates via database unique constraint", async () => {
      const punchTime1 = `${testDate}T08:50:00.000Z`;
      const punchTime2 = `${testDate}T17:05:00.000Z`;

      // First batch
      const batch1 = await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          {
            employeeNumber: "EMP-100",
            punchTime: punchTime1,
            punchType: "CHECK_IN",
          },
          {
            employeeNumber: "EMP-100",
            punchTime: punchTime2,
            punchType: "CHECK_OUT",
          },
        ],
      });

      expect(batch1.success).toBe(true);
      expect(batch1.insertedCount).toBe(2);
      expect(batch1.duplicatesSkipped).toBe(0);

      // Duplicate batch containing the exact same timestamps plus one new punch
      const punchTime3 = `${testDate}T18:00:00.000Z`;
      const batch2 = await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          {
            employeeNumber: "EMP-100",
            punchTime: punchTime1,
            punchType: "CHECK_IN",
          }, // duplicate
          {
            employeeNumber: "EMP-100",
            punchTime: punchTime2,
            punchType: "CHECK_OUT",
          }, // duplicate
          {
            employeeNumber: "EMP-200",
            punchTime: punchTime3,
            punchType: "CHECK_IN",
          }, // new
        ],
      });

      expect(batch2.success).toBe(true);
      expect(batch2.insertedCount).toBe(1);
      expect(batch2.duplicatesSkipped).toBe(2);

      // Verify total records in database
      const totalRawLogs = await prisma.rawAttendanceLog.count();
      expect(totalRawLogs).toBe(3);
    });

    it("retrieves raw punch stream scoped to branch", async () => {
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          { employeeNumber: "EMP-100", punchTime: `${testDate}T08:45:00.000Z` },
        ],
      });

      const logsRes = await getRawAttendanceLogsAction(branchAId, testDate);
      expect(logsRes.success).toBe(true);
      expect(logsRes.logs?.length).toBe(1);
      expect(logsRes.logs?.[0].employeeNumber).toBe("EMP-100");
    });
  });

  // -------------------------------------------------------------
  // Attendance Processing & Calculation Engine (AC-3)
  // -------------------------------------------------------------
  describe("Daily Attendance Calculation Engine", () => {
    it("calculates PRESENT status and work duration for on-time punches", async () => {
      // EMP-100 clocks in at 08:55 (on time) and clocks out at 17:05 (5m overtime)
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          {
            employeeNumber: "EMP-100",
            punchTime: `${testDate}T08:55:00.000Z`,
            punchType: "CHECK_IN",
          },
          {
            employeeNumber: "EMP-100",
            punchTime: `${testDate}T17:05:00.000Z`,
            punchType: "CHECK_OUT",
          },
        ],
      });

      const records = await prisma.attendanceRecord.findMany({
        where: { employeeId: employee1Id },
      });

      expect(records).toHaveLength(1);
      const record = records[0];
      expect(record.status).toBe("PRESENT");
      expect(record.lateMinutes).toBe(0);
      expect(record.totalWorkMinutes).toBe(490); // 8h 10m
      expect(record.overtimeMinutes).toBe(5);
    });

    it("calculates LATE status and late minutes when clock-in exceeds grace period", async () => {
      // Shift start: 09:00, grace: 15m (up to 09:15).
      // EMP-100 clocks in at 09:35 (35 mins late).
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          {
            employeeNumber: "EMP-100",
            punchTime: `${testDate}T09:35:00.000Z`,
            punchType: "CHECK_IN",
          },
          {
            employeeNumber: "EMP-100",
            punchTime: `${testDate}T17:00:00.000Z`,
            punchType: "CHECK_OUT",
          },
        ],
      });

      const record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee1Id },
      });

      expect(record).not.toBeNull();
      expect(record?.status).toBe("LATE");
      expect(record?.lateMinutes).toBe(35);
    });

    it("calculates HALF_DAY when total work duration is under 4 hours", async () => {
      // EMP-100 clocks in at 09:00 and leaves early at 12:00 (3 hours = 180 mins)
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          { employeeNumber: "EMP-100", punchTime: `${testDate}T09:00:00.000Z` },
          { employeeNumber: "EMP-100", punchTime: `${testDate}T12:00:00.000Z` },
        ],
      });

      const record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee1Id },
      });

      expect(record?.status).toBe("HALF_DAY");
      expect(record?.totalWorkMinutes).toBe(180);
      expect(record?.earlyExitMinutes).toBe(300); // 5 hours early
    });

    it("records ABSENT status when enrolled employee logs zero punches", async () => {
      // Only EMP-100 punches; EMP-200 does not punch at all
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          { employeeNumber: "EMP-100", punchTime: `${testDate}T09:00:00.000Z` },
          { employeeNumber: "EMP-100", punchTime: `${testDate}T17:00:00.000Z` },
        ],
      });

      const emp2Record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee2Id },
      });

      expect(emp2Record).not.toBeNull();
      expect(emp2Record?.status).toBe("ABSENT");
      expect(emp2Record?.totalWorkMinutes).toBe(0);
    });

    it("recalculates daily attendance via processRawAttendancePunchesAction", async () => {
      // Ingest punch without automatic trigger simulation
      await prisma.rawAttendanceLog.create({
        data: {
          branchId: branchAId,
          deviceId: "ZK-OFFLINE-01",
          employeeNumber: "EMP-100",
          punchTime: new Date(`${testDate}T08:58:00.000Z`),
          processed: false,
        },
      });

      const reprocessRes = await processRawAttendancePunchesAction({
        branchId: branchAId,
        date: testDate,
      });

      expect(reprocessRes.success).toBe(true);
      expect(reprocessRes.processedCount).toBeGreaterThanOrEqual(1);

      const record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee1Id },
      });
      expect(record?.status).toBe("PRESENT");
    });
  });

  // -------------------------------------------------------------
  // Manual Attendance Correction & Audit (AC-4)
  // -------------------------------------------------------------
  describe("Manual Attendance Correction and Audit", () => {
    it("adjusts punch times and status, recording transactional audit trail", async () => {
      // EMP-200 was initially marked ABSENT
      await processRawAttendancePunchesAction({
        branchId: branchAId,
        date: testDate,
      });

      const initialRecord = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee2Id },
      });
      expect(initialRecord?.status).toBe("ABSENT");

      // Supervisor manually corrects to PRESENT
      const adjustRes = await manualAttendanceCorrectionAction({
        id: initialRecord!.id,
        checkIn: `${testDate}T09:00:00.000Z`,
        checkOut: `${testDate}T17:00:00.000Z`,
        status: "PRESENT",
        reason:
          "Card reader offline at north gate; supervisor confirmed on-site",
      });

      expect(adjustRes.success).toBe(true);
      expect(adjustRes.record?.status).toBe("PRESENT");
      expect(adjustRes.record?.isManualCorrection).toBe(true);
      expect(adjustRes.record?.correctionReason).toContain(
        "Card reader offline"
      );

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "AttendanceRecord",
          entityId: initialRecord!.id,
          action: "ATTENDANCE_CORRECTION",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(supervisorUserId);
    });

    it("enforces mandatory justification reason for adjustments", async () => {
      await processRawAttendancePunchesAction({
        branchId: branchAId,
        date: testDate,
      });

      const record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee1Id },
      });

      const failRes = await manualAttendanceCorrectionAction({
        id: record!.id,
        status: "PRESENT",
        reason: "   ", // Blank reason
      });

      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain("Reason");
    });

    it("preserves manual corrections during subsequent automated ingestion runs", async () => {
      await processRawAttendancePunchesAction({
        branchId: branchAId,
        date: testDate,
      });

      const record = await prisma.attendanceRecord.findFirst({
        where: { employeeId: employee1Id },
      });

      // Apply manual adjustment
      await manualAttendanceCorrectionAction({
        id: record!.id,
        status: "ON_LEAVE",
        reason: "Approved emergency bereavement leave",
      });

      // Run automated processing again
      await processRawAttendancePunchesAction({
        branchId: branchAId,
        date: testDate,
      });

      const verified = await prisma.attendanceRecord.findUnique({
        where: { id: record!.id },
      });

      // Should still be ON_LEAVE
      expect(verified?.status).toBe("ON_LEAVE");
      expect(verified?.isManualCorrection).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Attendance Queries (AC-5)
  // -------------------------------------------------------------
  describe("Attendance Queries and Filtering", () => {
    it("filters daily attendance ledger by branch, department, and status", async () => {
      await ingestRawPunchesAction({
        branchId: branchAId,
        deviceId: "ZK-TERM-01",
        punches: [
          { employeeNumber: "EMP-100", punchTime: `${testDate}T09:00:00.000Z` },
          { employeeNumber: "EMP-100", punchTime: `${testDate}T17:00:00.000Z` },
        ],
      });

      const queryRes = await getDailyAttendanceAction({
        branchId: branchAId,
        date: testDate,
        departmentId: departmentAId,
        status: "PRESENT",
      });

      expect(queryRes.success).toBe(true);
      expect(queryRes.records?.length).toBe(1);
      expect(queryRes.records?.[0].employee.employeeNumber).toBe("EMP-100");
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });
});
