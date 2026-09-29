import { z } from "zod";

export const salaryComponentTypeEnum = z.enum(["EARNING", "DEDUCTION"]);

export const componentCalculationTypeEnum = z.enum([
  "FIXED",
  "PERCENTAGE_OF_BASIC",
]);

export const payrollRunStatusEnum = z.enum([
  "DRAFT",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
]);

export const payslipStatusEnum = z.enum([
  "DRAFT",
  "APPROVED",
  "PAID",
  "CANCELLED",
]);

export const createSalaryComponentSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  type: salaryComponentTypeEnum,
  calculationType: componentCalculationTypeEnum.default("FIXED"),
  defaultAmount: z
    .number()
    .int("Amount must be an integer minor unit")
    .min(0, "Amount cannot be negative")
    .default(0),
  isTaxable: z.boolean().default(true),
});

export type CreateSalaryComponentInput = z.input<
  typeof createSalaryComponentSchema
>;

export const updateSalaryComponentSchema = z.object({
  id: z.string().min(1, "Component ID is required"),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    )
    .optional(),
  type: salaryComponentTypeEnum.optional(),
  calculationType: componentCalculationTypeEnum.optional(),
  defaultAmount: z
    .number()
    .int("Amount must be an integer minor unit")
    .min(0, "Amount cannot be negative")
    .optional(),
  isTaxable: z.boolean().optional(),
});

export type UpdateSalaryComponentInput = z.input<
  typeof updateSalaryComponentSchema
>;

export const executePayrollRunSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  year: z
    .number()
    .int()
    .min(2020, "Year must be 2020 or later")
    .max(2100, "Year must be 2100 or earlier"),
  month: z
    .number()
    .int()
    .min(1, "Month must be between 1 and 12")
    .max(12, "Month must be between 1 and 12"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type ExecutePayrollRunInput = z.input<typeof executePayrollRunSchema>;

export const markPayslipsPaidSchema = z.object({
  runId: z.string().min(1, "Payroll run ID is required"),
  paymentMethod: z
    .enum(["BANK_TRANSFER", "CASH", "CHEQUE"])
    .default("BANK_TRANSFER"),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format")
    .optional(),
});

export type MarkPayslipsPaidInput = z.input<typeof markPayslipsPaidSchema>;
