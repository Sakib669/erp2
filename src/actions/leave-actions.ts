"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  submitLeaveRequestSchema,
  approveLeaveRequestSchema,
  rejectLeaveRequestSchema,
  allocateLeaveBalanceSchema,
  type CreateLeaveTypeInput,
  type UpdateLeaveTypeInput,
  type SubmitLeaveRequestInput,
  type ApproveLeaveRequestInput,
  type RejectLeaveRequestInput,
  type AllocateLeaveBalanceInput,
} from "@/lib/validations/leave";
import { LeaveRequestStatus, AttendanceStatus } from "@prisma/client";

// -------------------------------------------------------------
// Leave Type Actions
// -------------------------------------------------------------

export async function createLeaveTypeAction(rawInput: CreateLeaveTypeInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = createLeaveTypeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.leaveType.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Leave type code '${data.code}' already exists for this company`,
    };
  }

  const leaveType = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "LeaveType", entityId: "" },
    async (tx) => {
      return tx.leaveType.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          code: data.code.toUpperCase().trim(),
          description: data.description || null,
          defaultDaysPerYear: data.defaultDaysPerYear,
          isPaid: data.isPaid,
          requiresApproval: data.requiresApproval,
          carryForwardMaxDays: data.carryForwardMaxDays,
        },
      });
    }
  );

  revalidatePath("/leave/types");
  revalidatePath("/leave");
  return { success: true, leaveType };
}

export async function updateLeaveTypeAction(rawInput: UpdateLeaveTypeInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = updateLeaveTypeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.leaveType.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Leave type not found" };
  }

  if (data.code && data.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.leaveType.findFirst({
      where: {
        companyId: existing.companyId,
        code: data.code.toUpperCase().trim(),
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Leave code '${data.code}' is already used by another leave category`,
      };
    }
  }

  const leaveType = await withAuditTransaction(
    { userId: user.id },
    { action: "UPDATE", entity: "LeaveType", entityId: id, before: existing },
    async (tx) => {
      return tx.leaveType.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          code: data.code ? data.code.toUpperCase().trim() : existing.code,
          description:
            data.description !== undefined
              ? data.description
              : existing.description,
          defaultDaysPerYear:
            data.defaultDaysPerYear ?? existing.defaultDaysPerYear,
          isPaid: data.isPaid !== undefined ? data.isPaid : existing.isPaid,
          requiresApproval:
            data.requiresApproval !== undefined
              ? data.requiresApproval
              : existing.requiresApproval,
          carryForwardMaxDays:
            data.carryForwardMaxDays ?? existing.carryForwardMaxDays,
        },
      });
    }
  );

  revalidatePath("/leave/types");
  revalidatePath("/leave");
  return { success: true, leaveType };
}

export async function deleteLeaveTypeAction(leaveTypeId: string) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const existing = await prisma.leaveType.findFirst({
    where: { id: leaveTypeId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Leave category not found" };
  }

  const activeBalancesCount = await prisma.leaveBalance.count({
    where: {
      leaveTypeId,
      deletedAt: null,
      usedDays: { gt: 0 },
    },
  });

  if (activeBalancesCount > 0) {
    return {
      success: false,
      error: `Cannot delete leave category with ${activeBalancesCount} existing employee usage records`,
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    {
      action: "DELETE",
      entity: "LeaveType",
      entityId: leaveTypeId,
      before: existing,
    },
    async (tx) => {
      return tx.leaveType.update({
        where: { id: leaveTypeId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/leave/types");
  revalidatePath("/leave");
  return { success: true };
}

export async function getLeaveTypesAction(companyId?: string) {
  await requireAuth();
  await requirePermission("HR_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, leaveTypes: [] };
  }

  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      companyId: targetCompanyId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          leaveBalances: true,
          leaveRequests: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return { success: true, leaveTypes };
}

// -------------------------------------------------------------
// Leave Balance Actions
// -------------------------------------------------------------

export async function allocateLeaveBalanceAction(
  rawInput: AllocateLeaveBalanceInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = allocateLeaveBalanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const balance = await withAuditTransaction(
    { userId: user.id },
    {
      action: "ALLOCATE_LEAVE_BALANCE",
      entity: "LeaveBalance",
      entityId: "",
    },
    async (tx) => {
      return tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: data.employeeId,
            leaveTypeId: data.leaveTypeId,
            year: data.year,
          },
        },
        create: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
          entitledDays: data.entitledDays,
          carriedForwardDays: data.carriedForwardDays,
        },
        update: {
          entitledDays: data.entitledDays,
          carriedForwardDays: data.carriedForwardDays,
        },
      });
    }
  );

  revalidatePath("/leave");
  return { success: true, balance };
}

export async function getEmployeeLeaveBalancesAction(
  employeeId: string,
  year?: number
) {
  await requireAuth();

  const targetYear = year || new Date().getFullYear();

  // Fetch all active leave types for company
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
  });

  if (!employee) {
    return { success: false, error: "Employee record not found" };
  }

  const leaveTypes = await prisma.leaveType.findMany({
    where: { companyId: employee.companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  // Ensure balance rows exist for each leave type
  for (const lt of leaveTypes) {
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId: lt.id,
          year: targetYear,
        },
      },
    });

    if (!existing) {
      await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId: lt.id,
          year: targetYear,
          entitledDays: lt.defaultDaysPerYear,
          carriedForwardDays: 0,
        },
      });
    }
  }

  const balances = await prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year: targetYear,
      deletedAt: null,
    },
    include: {
      leaveType: true,
    },
    orderBy: { leaveType: { name: "asc" } },
  });

  const formatted = balances.map((b) => ({
    ...b,
    availableDays:
      b.entitledDays + b.carriedForwardDays - (b.usedDays + b.pendingDays),
  }));

  return { success: true, balances: formatted };
}

// -------------------------------------------------------------
// Leave Request Actions
// -------------------------------------------------------------

export async function submitLeaveRequestAction(
  rawInput: SubmitLeaveRequestInput
) {
  const user = await requireAuth();

  const parsed = submitLeaveRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, deletedAt: null },
  });

  if (!employee) {
    return { success: false, error: "Employee record not found" };
  }

  const year = new Date(data.startDate).getFullYear();

  // Find or create balance
  let balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year,
      },
    },
  });

  if (!balance) {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: data.leaveTypeId },
    });
    if (!leaveType) {
      return { success: false, error: "Leave type not found" };
    }

    balance = await prisma.leaveBalance.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year,
        entitledDays: leaveType.defaultDaysPerYear,
        carriedForwardDays: 0,
      },
    });
  }

  const availableDays =
    balance.entitledDays +
    balance.carriedForwardDays -
    (balance.usedDays + balance.pendingDays);

  if (data.daysCount > availableDays) {
    return {
      success: false,
      error: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${data.daysCount} days.`,
    };
  }

  const request = await withAuditTransaction(
    { userId: user.id, branchId: employee.branchId },
    {
      action: "SUBMIT_LEAVE_REQUEST",
      entity: "LeaveRequest",
      entityId: "",
    },
    async (tx) => {
      // Lock requested days into pendingDays
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: { increment: data.daysCount },
        },
      });

      return tx.leaveRequest.create({
        data: {
          employeeId: data.employeeId,
          branchId: employee.branchId,
          leaveTypeId: data.leaveTypeId,
          startDate: new Date(`${data.startDate}T00:00:00.000Z`),
          endDate: new Date(`${data.endDate}T00:00:00.000Z`),
          daysCount: data.daysCount,
          reason: data.reason,
          status: LeaveRequestStatus.PENDING,
        },
        include: {
          leaveType: true,
          employee: true,
        },
      });
    }
  );

  revalidatePath("/leave");
  return { success: true, request };
}

export async function approveLeaveRequestAction(
  rawInput: ApproveLeaveRequestInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = approveLeaveRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, approvalNotes } = parsed.data;

  const existing = await prisma.leaveRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: true,
      leaveType: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Leave request not found" };
  }

  if (existing.status !== LeaveRequestStatus.PENDING) {
    return {
      success: false,
      error: `Leave request has already been ${existing.status.toLowerCase()}`,
    };
  }

  const year = existing.startDate.getFullYear();

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        year,
      },
    },
  });

  if (!balance) {
    return { success: false, error: "Employee leave balance not found" };
  }

  const request = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "APPROVE_LEAVE_REQUEST",
      entity: "LeaveRequest",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      // Transfer pendingDays to usedDays
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: { decrement: existing.daysCount },
          usedDays: { increment: existing.daysCount },
        },
      });

      // Update request status
      const updatedRequest = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.APPROVED,
          approvedByUserId: user.id,
          approvalNotes: approvalNotes || null,
          approvedAt: new Date(),
        },
      });

      // Synchronize AttendanceRecord for every day in range
      const curr = new Date(existing.startDate);
      const end = new Date(existing.endDate);

      while (curr <= end) {
        const dateMidnight = new Date(curr);
        dateMidnight.setUTCHours(0, 0, 0, 0);

        await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: existing.employeeId,
              date: dateMidnight,
            },
          },
          create: {
            employeeId: existing.employeeId,
            branchId: existing.branchId,
            date: dateMidnight,
            shiftId: existing.employee.shiftId,
            status: AttendanceStatus.ON_LEAVE,
            totalWorkMinutes: 0,
            lateMinutes: 0,
            overtimeMinutes: 0,
            isManualCorrection: true,
            correctionReason: `Authorized ${existing.leaveType.name} Leave`,
            approvedByUserId: user.id,
          },
          update: {
            status: AttendanceStatus.ON_LEAVE,
            totalWorkMinutes: 0,
            lateMinutes: 0,
            overtimeMinutes: 0,
            isManualCorrection: true,
            correctionReason: `Authorized ${existing.leaveType.name} Leave`,
            approvedByUserId: user.id,
          },
        });

        // Advance 1 day
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      return updatedRequest;
    }
  );

  revalidatePath("/leave");
  revalidatePath("/attendance");
  return { success: true, request };
}

export async function rejectLeaveRequestAction(
  rawInput: RejectLeaveRequestInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = rejectLeaveRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, rejectionReason } = parsed.data;

  const existing = await prisma.leaveRequest.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Leave request not found" };
  }

  if (existing.status !== LeaveRequestStatus.PENDING) {
    return {
      success: false,
      error: `Leave request has already been ${existing.status.toLowerCase()}`,
    };
  }

  const year = existing.startDate.getFullYear();

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        year,
      },
    },
  });

  const request = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "REJECT_LEAVE_REQUEST",
      entity: "LeaveRequest",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      // Release pending days back to available pool
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: { decrement: existing.daysCount },
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveRequestStatus.REJECTED,
          rejectionReason,
          approvedByUserId: user.id,
          approvedAt: new Date(),
        },
      });
    }
  );

  revalidatePath("/leave");
  return { success: true, request };
}

export async function cancelLeaveRequestAction(requestId: string) {
  const user = await requireAuth();

  const existing = await prisma.leaveRequest.findFirst({
    where: { id: requestId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Leave request not found" };
  }

  if (
    existing.status !== LeaveRequestStatus.PENDING &&
    existing.status !== LeaveRequestStatus.APPROVED
  ) {
    return {
      success: false,
      error: `Cannot cancel request with status ${existing.status}`,
    };
  }

  const year = existing.startDate.getFullYear();

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: existing.employeeId,
        leaveTypeId: existing.leaveTypeId,
        year,
      },
    },
  });

  await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "CANCEL_LEAVE_REQUEST",
      entity: "LeaveRequest",
      entityId: requestId,
      before: existing,
    },
    async (tx) => {
      if (balance) {
        if (existing.status === LeaveRequestStatus.PENDING) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: { decrement: existing.daysCount },
            },
          });
        } else if (existing.status === LeaveRequestStatus.APPROVED) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: { decrement: existing.daysCount },
            },
          });
        }
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: LeaveRequestStatus.CANCELLED },
      });
    }
  );

  revalidatePath("/leave");
  return { success: true };
}

export async function getLeaveRequestsAction(filters?: {
  branchId?: string;
  employeeId?: string;
  status?: string;
  year?: number;
}) {
  const user = await requireAuth();
  await requirePermission("HR_VIEW");

  const targetBranchId = filters?.branchId || user.activeBranchId;

  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };

  if (targetBranchId && !user.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = targetBranchId;
  } else if (filters?.branchId) {
    whereClause.branchId = filters.branchId;
  }

  if (filters?.employeeId) {
    whereClause.employeeId = filters.employeeId;
  }

  if (filters?.status && filters.status !== "ALL") {
    whereClause.status = filters.status as LeaveRequestStatus;
  }

  if (filters?.year) {
    const startYear = new Date(`${filters.year}-01-01T00:00:00.000Z`);
    const endYear = new Date(`${filters.year}-12-31T23:59:59.999Z`);
    whereClause.startDate = {
      gte: startYear,
      lte: endYear,
    };
  }

  const requests = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
        },
      },
      leaveType: {
        select: {
          id: true,
          name: true,
          code: true,
          isPaid: true,
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
    orderBy: { createdAt: "desc" },
  });

  return { success: true, requests };
}
