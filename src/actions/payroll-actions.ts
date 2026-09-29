"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  executePayrollRunSchema,
  markPayslipsPaidSchema,
  type CreateSalaryComponentInput,
  type UpdateSalaryComponentInput,
  type ExecutePayrollRunInput,
  type MarkPayslipsPaidInput,
} from "@/lib/validations/payroll";
import {
  SalaryComponentType,
  ComponentCalculationType,
  PayrollRunStatus,
  PayslipStatus,
  AttendanceStatus,
} from "@prisma/client";

// -------------------------------------------------------------
// Salary Component Actions
// -------------------------------------------------------------

export async function createSalaryComponentAction(
  rawInput: CreateSalaryComponentInput
) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_MANAGE");

  const parsed = createSalaryComponentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.salaryComponent.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Salary component code '${data.code}' already exists for this company`,
    };
  }

  const component = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "SalaryComponent", entityId: "" },
    async (tx) => {
      return tx.salaryComponent.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          code: data.code.toUpperCase().trim(),
          type: data.type as SalaryComponentType,
          calculationType: data.calculationType as ComponentCalculationType,
          defaultAmount: data.defaultAmount,
          isTaxable: data.isTaxable,
        },
      });
    }
  );

  revalidatePath("/payroll/components");
  revalidatePath("/payroll");
  return { success: true, component };
}

export async function updateSalaryComponentAction(
  rawInput: UpdateSalaryComponentInput
) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_MANAGE");

  const parsed = updateSalaryComponentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.salaryComponent.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Salary component not found" };
  }

  if (data.code && data.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.salaryComponent.findFirst({
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
        error: `Salary component code '${data.code}' already in use`,
      };
    }
  }

  const component = await withAuditTransaction(
    { userId: user.id },
    {
      action: "UPDATE",
      entity: "SalaryComponent",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      return tx.salaryComponent.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          code: data.code ? data.code.toUpperCase().trim() : existing.code,
          type: (data.type as SalaryComponentType) ?? existing.type,
          calculationType:
            (data.calculationType as ComponentCalculationType) ??
            existing.calculationType,
          defaultAmount:
            data.defaultAmount !== undefined
              ? data.defaultAmount
              : existing.defaultAmount,
          isTaxable:
            data.isTaxable !== undefined ? data.isTaxable : existing.isTaxable,
        },
      });
    }
  );

  revalidatePath("/payroll/components");
  revalidatePath("/payroll");
  return { success: true, component };
}

export async function deleteSalaryComponentAction(componentId: string) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_MANAGE");

  const existing = await prisma.salaryComponent.findFirst({
    where: { id: componentId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Salary component not found" };
  }

  const usedInPayslips = await prisma.payslipItem.count({
    where: { salaryComponentId: componentId },
  });

  if (usedInPayslips > 0) {
    return {
      success: false,
      error: `Cannot delete component used in ${usedInPayslips} historical payslip records`,
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    {
      action: "DELETE",
      entity: "SalaryComponent",
      entityId: componentId,
      before: existing,
    },
    async (tx) => {
      return tx.salaryComponent.update({
        where: { id: componentId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/payroll/components");
  revalidatePath("/payroll");
  return { success: true };
}

export async function getSalaryComponentsAction(companyId?: string) {
  await requireAuth();
  await requirePermission("PAYROLL_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, components: [] };
  }

  const components = await prisma.salaryComponent.findMany({
    where: { companyId: targetCompanyId, deletedAt: null },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return { success: true, components };
}

// -------------------------------------------------------------
// Payroll Calculation & Execution Engine
// -------------------------------------------------------------

export async function executePayrollRunAction(
  rawInput: ExecutePayrollRunInput
) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_MANAGE");

  const parsed = executePayrollRunSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { branchId, year, month, notes } = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });

  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  const idempotencyKey = `PAYROLL-${branchId}-${year}-${month}`;

  // Check if completed run already exists
  const existingRun = await prisma.payrollRun.findUnique({
    where: { idempotencyKey },
  });

  if (existingRun && existingRun.status === PayrollRunStatus.COMPLETED) {
    return {
      success: false,
      error: `Payroll run for period ${year}-${String(month).padStart(2, "0")} has already been completed`,
    };
  }

  // Calculate month boundaries in UTC
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(
    Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999)
  );

  // Fetch all active employees enrolled in this branch
  const employees = await prisma.employee.findMany({
    where: {
      branchId,
      deletedAt: null,
      status: "ACTIVE",
      joinDate: { lte: monthEnd },
    },
    include: {
      department: true,
      designation: true,
    },
    orderBy: { firstName: "asc" },
  });

  if (employees.length === 0) {
    return {
      success: false,
      error: "No active employees found in this branch for the selected period",
    };
  }

  // Fetch active salary components for company
  const salaryComponents = await prisma.salaryComponent.findMany({
    where: {
      companyId: branch.companyId,
      deletedAt: null,
    },
  });

  const payrollRun = await withAuditTransaction(
    { userId: user.id, branchId },
    {
      action: "EXECUTE_PAYROLL_RUN",
      entity: "PayrollRun",
      entityId: existingRun ? existingRun.id : "",
    },
    async (tx) => {
      // If previous draft run exists, purge existing payslips
      if (existingRun) {
        await tx.payslip.deleteMany({
          where: { payrollRunId: existingRun.id },
        });
      }

      // Create or update payroll run
      const run = existingRun
        ? await tx.payrollRun.update({
            where: { id: existingRun.id },
            data: {
              status: PayrollRunStatus.PROCESSING,
              notes: notes || null,
              processedByUserId: user.id,
              processedAt: new Date(),
            },
          })
        : await tx.payrollRun.create({
            data: {
              companyId: branch.companyId,
              branchId,
              year,
              month,
              status: PayrollRunStatus.PROCESSING,
              idempotencyKey,
              notes: notes || null,
              processedByUserId: user.id,
              processedAt: new Date(),
            },
          });

      let totalGrossAll = 0;
      let totalDeductionsAll = 0;
      let totalNetAll = 0;

      for (const emp of employees) {
        // Proration calculation for mid month joiners
        let prorationRatio = 1.0;
        let paidDays = daysInMonth;

        if (emp.joinDate > monthStart) {
          const joinDay = emp.joinDate.getUTCDate();
          const activeDays = Math.max(1, daysInMonth - joinDay + 1);
          prorationRatio = activeDays / daysInMonth;
          paidDays = activeDays;
        }

        const proratedBase = Math.round(emp.baseSalary * prorationRatio);
        const dailyRate = Math.round(emp.baseSalary / daysInMonth);

        // Calculate unpaid absences / unpaid leave days
        const absentAttendanceCount = await tx.attendanceRecord.count({
          where: {
            employeeId: emp.id,
            date: { gte: monthStart, lte: monthEnd },
            status: AttendanceStatus.ABSENT,
            deletedAt: null,
          },
        });

        const unpaidLeaves = await tx.leaveRequest.findMany({
          where: {
            employeeId: emp.id,
            status: "APPROVED",
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
            leaveType: { isPaid: false },
            deletedAt: null,
          },
        });

        const unpaidLeaveDaysCount = unpaidLeaves.reduce(
          (sum, r) => sum + r.daysCount,
          0
        );

        const totalUnpaidDays = absentAttendanceCount + unpaidLeaveDaysCount;
        const unpaidDeductionAmount = totalUnpaidDays * dailyRate;

        paidDays = Math.max(0, paidDays - totalUnpaidDays);

        // Process line items
        const lineItems: Array<{
          salaryComponentId?: string;
          name: string;
          code: string;
          type: SalaryComponentType;
          amount: number;
        }> = [];

        // Base salary item
        lineItems.push({
          name: "Base Salary",
          code: "BASE",
          type: SalaryComponentType.EARNING,
          amount: proratedBase,
        });

        let additionalEarnings = 0;
        let deductionsTotal = 0;

        // Apply active salary components
        for (const comp of salaryComponents) {
          let itemAmount = 0;
          if (
            comp.calculationType ===
            ComponentCalculationType.PERCENTAGE_OF_BASIC
          ) {
            // defaultAmount stored in basis points (e.g. 1000 = 10.00%)
            itemAmount = Math.round(
              (proratedBase * comp.defaultAmount) / 10000
            );
          } else {
            // Fixed amount in cents
            itemAmount = comp.defaultAmount;
          }

          if (comp.type === SalaryComponentType.EARNING) {
            additionalEarnings += itemAmount;
            lineItems.push({
              salaryComponentId: comp.id,
              name: comp.name,
              code: comp.code,
              type: SalaryComponentType.EARNING,
              amount: itemAmount,
            });
          } else {
            deductionsTotal += itemAmount;
            lineItems.push({
              salaryComponentId: comp.id,
              name: comp.name,
              code: comp.code,
              type: SalaryComponentType.DEDUCTION,
              amount: itemAmount,
            });
          }
        }

        // Add unpaid absence deduction if applicable
        if (unpaidDeductionAmount > 0) {
          deductionsTotal += unpaidDeductionAmount;
          lineItems.push({
            name: "Unpaid Absence Deduction",
            code: "UNPAID_ABSENCE",
            type: SalaryComponentType.DEDUCTION,
            amount: unpaidDeductionAmount,
          });
        }

        const employeeGross = proratedBase + additionalEarnings;
        const employeeNet = Math.max(0, employeeGross - deductionsTotal);

        totalGrossAll += employeeGross;
        totalDeductionsAll += deductionsTotal;
        totalNetAll += employeeNet;

        // Create Payslip record
        const payslip = await tx.payslip.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            branchId,
            year,
            month,
            baseSalary: emp.baseSalary,
            grossEarnings: employeeGross,
            totalDeductions: deductionsTotal,
            netSalary: employeeNet,
            workingDays: daysInMonth,
            paidDays,
            unpaidLeaveDays: totalUnpaidDays,
            prorationRatio,
            status: PayslipStatus.APPROVED,
          },
        });

        // Insert Payslip item breakdown
        for (const item of lineItems) {
          await tx.payslipItem.create({
            data: {
              payslipId: payslip.id,
              salaryComponentId: item.salaryComponentId,
              name: item.name,
              code: item.code,
              type: item.type,
              amount: item.amount,
            },
          });
        }
      }

      // Mark run as COMPLETED with updated totals
      return tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: PayrollRunStatus.COMPLETED,
          totalGross: totalGrossAll,
          totalDeductions: totalDeductionsAll,
          totalNet: totalNetAll,
          employeeCount: employees.length,
        },
      });
    }
  );

  revalidatePath("/payroll");
  revalidatePath(`/payroll/runs/${payrollRun.id}`);
  return { success: true, payrollRun };
}

export async function getPayrollRunsAction(filters?: {
  branchId?: string;
  year?: number;
}) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_VIEW");

  const whereClause: Record<string, unknown> = { deletedAt: null };

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.year) {
    whereClause.year = filters.year;
  }

  const runs = await prisma.payrollRun.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { payslips: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return { success: true, runs };
}

export async function getPayrollRunDetailsAction(runId: string) {
  await requireAuth();
  await requirePermission("PAYROLL_VIEW");

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId, deletedAt: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              email: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
          items: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });

  if (!run) {
    return { success: false, error: "Payroll run not found" };
  }

  return { success: true, run };
}

export async function getPayslipDetailsAction(payslipId: string) {
  await requireAuth();

  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId, deletedAt: null },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          email: true,
          joinDate: true,
          department: { select: { name: true } },
          designation: { select: { title: true } },
        },
      },
      branch: { select: { name: true, code: true } },
      items: { orderBy: [{ type: "asc" }, { amount: "desc" }] },
    },
  });

  if (!payslip) {
    return { success: false, error: "Payslip not found" };
  }

  return { success: true, payslip };
}

export async function markPayslipsPaidAction(rawInput: MarkPayslipsPaidInput) {
  const user = await requireAuth();
  await requirePermission("PAYROLL_MANAGE");

  const parsed = markPayslipsPaidSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { runId, paymentMethod, paymentDate } = parsed.data;

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId, deletedAt: null },
  });

  if (!run) {
    return { success: false, error: "Payroll run not found" };
  }

  if (run.status !== PayrollRunStatus.COMPLETED) {
    return {
      success: false,
      error: "Only completed payroll runs can be marked as paid",
    };
  }

  const payDate = paymentDate
    ? new Date(`${paymentDate}T00:00:00.000Z`)
    : new Date();

  await withAuditTransaction(
    { userId: user.id, branchId: run.branchId },
    {
      action: "MARK_PAYSLIPS_PAID",
      entity: "PayrollRun",
      entityId: runId,
    },
    async (tx) => {
      return tx.payslip.updateMany({
        where: { payrollRunId: runId },
        data: {
          status: PayslipStatus.PAID,
          paymentDate: payDate,
          paymentMethod,
        },
      });
    }
  );

  revalidatePath(`/payroll/runs/${runId}`);
  revalidatePath("/payroll");
  return { success: true };
}
