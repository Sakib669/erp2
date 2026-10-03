import { z } from "zod";

export const reportTypeEnum = z.enum([
  "PROFIT_AND_LOSS",
  "PAYROLL_EXPENSES",
  "STOCK_VALUATION",
  "ATTENDANCE_SUMMARY",
]);

export type ReportType = z.infer<typeof reportTypeEnum>;

export const getExecutiveMetricsSchema = z.object({
  branchId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const generateReportSchema = z.object({
  reportType: reportTypeEnum,
  branchId: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
