"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getExecutiveMetricsSchema,
  generateReportSchema,
  ReportType,
} from "@/lib/validations/reporting";

async function getReportingContext(overrideBranchId?: string | null) {
  const user = await requireAuth();
  await requirePermission("REPORTS_VIEW");

  const cookieStore = await cookies();
  const branchId = overrideBranchId || cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch context required");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  return { user, branchId, companyId: branch.companyId };
}

export async function getExecutiveMetricsAction(
  rawInput?: z.input<typeof getExecutiveMetricsSchema>
) {
  const parsed = getExecutiveMetricsSchema.safeParse(rawInput || {});
  const overrideBranchId = parsed.success ? parsed.data.branchId : undefined;
  const { branchId, companyId } = await getReportingContext(overrideBranchId);

  // 1. Revenue and Expense calculations from posted Journal lines
  const postedEntries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      branchId,
      status: "POSTED",
      deletedAt: null,
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });

  let revenue = 0;
  let expenses = 0;

  for (const entry of postedEntries) {
    for (const line of entry.lines) {
      if (line.account.type === "REVENUE") {
        revenue += line.type === "CREDIT" ? line.amount : -line.amount;
      } else if (line.account.type === "EXPENSE") {
        expenses += line.type === "DEBIT" ? line.amount : -line.amount;
      }
    }
  }

  const netProfit = revenue - expenses;

  // 2. Active Employee Headcount
  const headcount = await prisma.employee.count({
    where: {
      branchId,
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  // 3. Stock inventory valuation
  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      warehouse: { branchId },
    },
    include: {
      item: true,
    },
  });

  const stockValuation = stockLevels.reduce((acc, curr) => {
    return acc + curr.quantityOnHand * curr.item.costPrice;
  }, 0);

  // 4. Pending approval requests
  const pendingApprovals = await prisma.approvalRequest.count({
    where: {
      branchId,
      status: "PENDING",
    },
  });

  // 5. Open helpdesk tickets
  const openTickets = await prisma.helpdeskTicket.count({
    where: {
      branchId,
      status: "OPEN",
      deletedAt: null,
    },
  });

  // Available branches for selection
  const branches = await prisma.branch.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return {
    success: true,
    data: {
      revenue,
      expenses,
      netProfit,
      headcount,
      stockValuation,
      pendingApprovals,
      openTickets,
      activeBranchId: branchId,
      branches,
    },
  };
}

export interface ReportColumn {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
}

export interface ReportResult {
  title: string;
  reportType: ReportType;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  summary?: Record<string, string | number>;
}

export async function generateDynamicReportAction(
  rawInput: z.input<typeof generateReportSchema>
): Promise<{ success: boolean; data?: ReportResult; error?: string }> {
  const parsed = generateReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const {
    reportType,
    branchId: overrideBranchId,
    startDate,
    endDate,
  } = parsed.data;
  const { branchId, companyId } = await getReportingContext(overrideBranchId);

  if (reportType === "PROFIT_AND_LOSS") {
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        type: { in: ["REVENUE", "EXPENSE"] },
        deletedAt: null,
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              branchId,
              status: "POSTED",
              deletedAt: null,
              ...(startDate && endDate
                ? { entryDate: { gte: startDate, lte: endDate } }
                : {}),
            },
          },
        },
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    let totalRevenue = 0;
    let totalExpense = 0;

    const rows = accounts.map((acc) => {
      let balance = 0;
      for (const line of acc.journalLines) {
        if (acc.type === "REVENUE") {
          balance += line.type === "CREDIT" ? line.amount : -line.amount;
        } else {
          balance += line.type === "DEBIT" ? line.amount : -line.amount;
        }
      }
      if (acc.type === "REVENUE") totalRevenue += balance;
      if (acc.type === "EXPENSE") totalExpense += balance;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: (balance / 100).toFixed(2),
      };
    });

    const columns: ReportColumn[] = [
      { key: "code", header: "Account Code" },
      { key: "name", header: "Account Name" },
      { key: "type", header: "Classification" },
      { key: "balance", header: "Total Amount ($)", align: "right" },
    ];

    return {
      success: true,
      data: {
        title: "Profit and Loss Statement",
        reportType,
        columns,
        rows,
        summary: {
          "Total Revenue ($)": (totalRevenue / 100).toFixed(2),
          "Total Expense ($)": (totalExpense / 100).toFixed(2),
          "Net Income ($)": ((totalRevenue - totalExpense) / 100).toFixed(2),
        },
      },
    };
  }

  if (reportType === "STOCK_VALUATION") {
    const stockLevels = await prisma.stockLevel.findMany({
      where: {
        warehouse: { branchId },
      },
      include: {
        item: {
          include: { category: true },
        },
        warehouse: true,
      },
      orderBy: { item: { name: "asc" } },
    });

    let cumulativeValuation = 0;
    let totalUnits = 0;

    const rows = stockLevels.map((sl) => {
      const lineTotal = sl.quantityOnHand * sl.item.costPrice;
      cumulativeValuation += lineTotal;
      totalUnits += sl.quantityOnHand;

      return {
        code: sl.item.code,
        name: sl.item.name,
        category: sl.item.category?.name || "General",
        warehouse: sl.warehouse.name,
        quantity: sl.quantityOnHand,
        costPrice: (sl.item.costPrice / 100).toFixed(2),
        totalValue: (lineTotal / 100).toFixed(2),
      };
    });

    const columns: ReportColumn[] = [
      { key: "code", header: "Item Code" },
      { key: "name", header: "Item Name" },
      { key: "category", header: "Category" },
      { key: "warehouse", header: "Warehouse" },
      { key: "quantity", header: "Quantity", align: "right" },
      { key: "costPrice", header: "Cost Price ($)", align: "right" },
      { key: "totalValue", header: "Total Value ($)", align: "right" },
    ];

    return {
      success: true,
      data: {
        title: "Inventory Stock Valuation",
        reportType,
        columns,
        rows,
        summary: {
          "Total Inventory Units": totalUnits,
          "Total Stock Value ($)": (cumulativeValuation / 100).toFixed(2),
        },
      },
    };
  }

  if (reportType === "PAYROLL_EXPENSES") {
    const payrollRuns = await prisma.payrollRun.findMany({
      where: {
        branchId,
        status: "COMPLETED",
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    let totalGrossDisbursed = 0;
    let totalDeductionsWithheld = 0;

    const rows = payrollRuns.map((pr) => {
      totalGrossDisbursed += pr.totalGross;
      totalDeductionsWithheld += pr.totalDeductions;
      const netPay = pr.totalGross - pr.totalDeductions;

      return {
        period: `${pr.year}-${String(pr.month).padStart(2, "0")}`,
        employees: pr.employeeCount,
        gross: (pr.totalGross / 100).toFixed(2),
        deductions: (pr.totalDeductions / 100).toFixed(2),
        net: (netPay / 100).toFixed(2),
        status: pr.status,
      };
    });

    const columns: ReportColumn[] = [
      { key: "period", header: "Pay Period" },
      { key: "employees", header: "Employees", align: "right" },
      { key: "gross", header: "Gross Pay ($)", align: "right" },
      { key: "deductions", header: "Deductions ($)", align: "right" },
      { key: "net", header: "Net Disbursement ($)", align: "right" },
      { key: "status", header: "Status" },
    ];

    return {
      success: true,
      data: {
        title: "Payroll Expenses Summary",
        reportType,
        columns,
        rows,
        summary: {
          "Total Gross ($)": (totalGrossDisbursed / 100).toFixed(2),
          "Total Deductions ($)": (totalDeductionsWithheld / 100).toFixed(2),
          "Total Net Disbursed ($)": (
            (totalGrossDisbursed - totalDeductionsWithheld) /
            100
          ).toFixed(2),
        },
      },
    };
  }

  // Fallback: ATTENDANCE_SUMMARY
  const records = await prisma.attendanceRecord.findMany({
    where: {
      branchId,
      ...(startDate && endDate
        ? { date: { gte: startDate, lte: endDate } }
        : {}),
    },
    include: {
      employee: true,
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  const rows = records.map((rec) => ({
    date: new Date(rec.date).toLocaleDateString(),
    employee: `${rec.employee.firstName} ${rec.employee.lastName}`,
    status: rec.status,
    checkIn: rec.checkIn
      ? new Date(rec.checkIn).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    checkOut: rec.checkOut
      ? new Date(rec.checkOut).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
  }));

  const columns: ReportColumn[] = [
    { key: "date", header: "Date" },
    { key: "employee", header: "Employee" },
    { key: "status", header: "Attendance Status" },
    { key: "checkIn", header: "Check In" },
    { key: "checkOut", header: "Check Out" },
  ];

  return {
    success: true,
    data: {
      title: "Attendance Summary Log",
      reportType,
      columns,
      rows,
      summary: {
        "Total Records Logged": rows.length,
      },
    },
  };
}

export async function exportReportToCsvAction(
  rawInput: z.input<typeof generateReportSchema>
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const result = await generateDynamicReportAction(rawInput);
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || "Failed to generate report",
    };
  }

  const { columns, rows } = result.data;
  const headerLine = columns
    .map((c) => `"${c.header.replace(/"/g, '""')}"`)
    .join(",");
  const dataLines = rows.map((row) => {
    return columns
      .map((c) => {
        const val = row[c.key] !== undefined ? String(row[c.key]) : "";
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  const csv = [headerLine, ...dataLines].join("\n");
  return { success: true, csv };
}
