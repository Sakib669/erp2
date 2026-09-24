"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  ingestPunchesSchema,
  manualAttendanceCorrectionSchema,
  processAttendanceSchema,
  queryAttendanceSchema,
  type IngestPunchesInput,
  type ManualAttendanceCorrectionInput,
  type ProcessAttendanceInput,
  type QueryAttendanceInput,
} from "@/lib/validations/attendance";
import { AttendanceStatus, PunchType, Prisma } from "@prisma/client";

// -------------------------------------------------------------
// Ingestion Server Action
// -------------------------------------------------------------

export async function ingestRawPunchesAction(rawInput: IngestPunchesInput) {
  const parsed = ingestPunchesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { branchId, deviceId, punches } = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });
  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  // Map punches to Prisma createMany inputs
  const recordsToInsert = punches.map((p) => ({
    branchId,
    deviceId,
    employeeNumber: p.employeeNumber,
    punchTime: new Date(p.punchTime),
    punchType: (p.punchType as PunchType) || PunchType.AUTO,
    rawPayload: p.rawPayload
      ? (JSON.parse(JSON.stringify(p.rawPayload)) as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  }));

  // Postgres ON CONFLICT DO NOTHING via skipDuplicates
  const result = await prisma.rawAttendanceLog.createMany({
    data: recordsToInsert,
    skipDuplicates: true,
  });

  // Extract unique dates affected to run automatic reconciliation
  const uniqueDates = Array.from(
    new Set(
      punches.map((p) => new Date(p.punchTime).toISOString().split("T")[0])
    )
  );

  for (const dateStr of uniqueDates) {
    await processAttendanceForDate(branchId, dateStr);
  }

  revalidatePath("/attendance");
  revalidatePath("/attendance/devices");

  return {
    success: true,
    totalReceived: punches.length,
    insertedCount: result.count,
    duplicatesSkipped: punches.length - result.count,
  };
}

// -------------------------------------------------------------
// Internal Attendance Processing Core
// -------------------------------------------------------------

export async function processAttendanceForDate(
  branchId: string,
  dateStr: string
) {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  // Fetch all active employees assigned to this branch
  const employees = await prisma.employee.findMany({
    where: {
      branchId,
      deletedAt: null,
    },
    include: {
      shift: true,
    },
  });

  if (employees.length === 0) {
    return 0;
  }

  // Fetch all raw punches for this branch on this calendar day
  const punches = await prisma.rawAttendanceLog.findMany({
    where: {
      branchId,
      punchTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { punchTime: "asc" },
  });

  // Group punches by employeeNumber
  const punchesByEmp = new Map<string, typeof punches>();
  for (const punch of punches) {
    const list = punchesByEmp.get(punch.employeeNumber) || [];
    list.push(punch);
    punchesByEmp.set(punch.employeeNumber, list);
  }

  let processedCount = 0;

  for (const emp of employees) {
    // Check if a manually corrected attendance record already exists
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: startOfDay,
        },
      },
    });

    if (existingRecord && existingRecord.isManualCorrection) {
      // Do not overwrite manual corrections from automated runs
      continue;
    }

    const empPunches = punchesByEmp.get(emp.employeeNumber) || [];

    if (empPunches.length === 0) {
      // No punch recorded
      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: startOfDay,
          },
        },
        create: {
          employeeId: emp.id,
          branchId,
          date: startOfDay,
          shiftId: emp.shiftId,
          status: AttendanceStatus.ABSENT,
          totalWorkMinutes: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          earlyExitMinutes: 0,
        },
        update: {
          status: AttendanceStatus.ABSENT,
          totalWorkMinutes: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          earlyExitMinutes: 0,
        },
      });
      processedCount++;
      continue;
    }

    // Has punches
    const checkIn = empPunches[0].punchTime;
    const checkOut =
      empPunches.length > 1
        ? empPunches[empPunches.length - 1].punchTime
        : null;

    let totalWorkMinutes = 0;
    if (checkOut) {
      totalWorkMinutes = Math.max(
        0,
        Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
      );
    }

    let lateMinutes = 0;
    let earlyExitMinutes = 0;
    let overtimeMinutes = 0;

    if (emp.shift) {
      const [startHour, startMin] = emp.shift.startTime.split(":").map(Number);
      const [endHour, endMin] = emp.shift.endTime.split(":").map(Number);

      const shiftStart = new Date(startOfDay);
      shiftStart.setUTCHours(startHour, startMin, 0, 0);

      const shiftEnd = new Date(startOfDay);
      shiftEnd.setUTCHours(endHour, endMin, 0, 0);

      // Check Late arrival beyond grace period
      const graceEnd = new Date(
        shiftStart.getTime() + emp.shift.gracePeriodMinutes * 60000
      );
      if (checkIn.getTime() > graceEnd.getTime()) {
        lateMinutes = Math.round(
          (checkIn.getTime() - shiftStart.getTime()) / 60000
        );
      }

      // Check Early departure
      if (checkOut && checkOut.getTime() < shiftEnd.getTime()) {
        earlyExitMinutes = Math.round(
          (shiftEnd.getTime() - checkOut.getTime()) / 60000
        );
      }

      // Check Overtime past shift end
      if (checkOut && checkOut.getTime() > shiftEnd.getTime()) {
        overtimeMinutes = Math.round(
          (checkOut.getTime() - shiftEnd.getTime()) / 60000
        );
      }
    }

    // Determine status
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (totalWorkMinutes > 0 && totalWorkMinutes < 240) {
      status = AttendanceStatus.HALF_DAY;
    } else if (lateMinutes > 0) {
      status = AttendanceStatus.LATE;
    } else {
      status = AttendanceStatus.PRESENT;
    }

    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: startOfDay,
        },
      },
      create: {
        employeeId: emp.id,
        branchId,
        date: startOfDay,
        shiftId: emp.shiftId,
        checkIn,
        checkOut,
        totalWorkMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        status,
        isManualCorrection: false,
      },
      update: {
        shiftId: emp.shiftId,
        checkIn,
        checkOut,
        totalWorkMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        status,
      },
    });

    processedCount++;
  }

  // Mark all processed raw punch logs as processed
  if (punches.length > 0) {
    await prisma.rawAttendanceLog.updateMany({
      where: {
        id: { in: punches.map((p) => p.id) },
      },
      data: { processed: true },
    });
  }

  return processedCount;
}

export async function processRawAttendancePunchesAction(
  rawInput: ProcessAttendanceInput
) {
  await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = processAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { branchId, date } = parsed.data;
  const count = await processAttendanceForDate(branchId, date);

  revalidatePath("/attendance");
  return { success: true, processedCount: count };
}

// -------------------------------------------------------------
// Manual Attendance Adjustment
// -------------------------------------------------------------

export async function manualAttendanceCorrectionAction(
  rawInput: ManualAttendanceCorrectionInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = manualAttendanceCorrectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, checkIn, checkOut, status, reason } = parsed.data;

  const existing = await prisma.attendanceRecord.findFirst({
    where: { id, deletedAt: null },
    include: { employee: true },
  });

  if (!existing) {
    return { success: false, error: "Attendance record not found" };
  }

  const checkInDate = checkIn ? new Date(checkIn) : existing.checkIn;
  const checkOutDate = checkOut ? new Date(checkOut) : existing.checkOut;

  let totalWorkMinutes = existing.totalWorkMinutes;
  if (checkInDate && checkOutDate) {
    totalWorkMinutes = Math.max(
      0,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
    );
  }

  const updated = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "ATTENDANCE_CORRECTION",
      entity: "AttendanceRecord",
      entityId: id,
      before: {
        record: existing,
        reason,
      },
    },
    async (tx) => {
      return tx.attendanceRecord.update({
        where: { id },
        data: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalWorkMinutes,
          status: status as AttendanceStatus,
          isManualCorrection: true,
          correctionReason: reason,
          approvedByUserId: user.id,
        },
      });
    }
  );

  revalidatePath("/attendance");
  return { success: true, record: updated };
}

// -------------------------------------------------------------
// Attendance Queries
// -------------------------------------------------------------

export async function getDailyAttendanceAction(rawInput: QueryAttendanceInput) {
  const user = await requireAuth();
  await requirePermission("HR_VIEW");

  const parsed = queryAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { date, departmentId, status, search } = parsed.data;
  const targetBranchId = parsed.data.branchId || user.activeBranchId;

  const startOfDay = new Date(`${date}T00:00:00.000Z`);

  const whereClause: Record<string, unknown> = {
    date: startOfDay,
    deletedAt: null,
  };

  if (targetBranchId) {
    whereClause.branchId = targetBranchId;
  }

  if (departmentId) {
    whereClause.employee = {
      ...(whereClause.employee as Record<string, unknown> | undefined),
      departmentId,
    };
  }

  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  if (search) {
    whereClause.employee = {
      ...(whereClause.employee as Record<string, unknown> | undefined),
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeNumber: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { employee: { firstName: "asc" } },
  });

  return { success: true, records };
}

export async function getRawAttendanceLogsAction(
  branchId?: string,
  dateStr?: string,
  limit: number = 50
) {
  const user = await requireAuth();
  await requirePermission("HR_VIEW");

  const targetBranchId = branchId || user.activeBranchId;

  const whereClause: Record<string, unknown> = {};
  if (targetBranchId) {
    whereClause.branchId = targetBranchId;
  }

  if (dateStr) {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    whereClause.punchTime = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const logs = await prisma.rawAttendanceLog.findMany({
    where: whereClause,
    include: {
      branch: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { punchTime: "desc" },
    take: limit,
  });

  return { success: true, logs };
}
