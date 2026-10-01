import { z } from "zod";

export const accountTypeEnum = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
]);

export const journalStatusEnum = z.enum(["DRAFT", "POSTED", "CANCELLED"]);

export const journalLineTypeEnum = z.enum(["DEBIT", "CREDIT"]);

export const createAccountSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  code: z
    .string()
    .trim()
    .min(1, "Account code is required")
    .max(30, "Account code cannot exceed 30 characters")
    .regex(
      /^[A-Z0-9_.-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, dots, and underscores"
    ),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  type: accountTypeEnum,
  currency: z.string().default("USD"),
  description: z.string().trim().max(500).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type CreateAccountInput = z.input<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  id: z.string().min(1, "Account ID is required"),
  code: z
    .string()
    .trim()
    .min(1, "Account code is required")
    .max(30, "Account code cannot exceed 30 characters")
    .regex(
      /^[A-Z0-9_.-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, dots, and underscores"
    )
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  type: accountTypeEnum.optional(),
  description: z.string().trim().max(500).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type UpdateAccountInput = z.input<typeof updateAccountSchema>;

export const createFiscalPeriodSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z
    .string()
    .trim()
    .min(2, "Period name is required")
    .max(50, "Period name cannot exceed 50 characters"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
});

export type CreateFiscalPeriodInput = z.input<typeof createFiscalPeriodSchema>;

export const toggleFiscalPeriodLockSchema = z.object({
  id: z.string().min(1, "Period ID is required"),
  isClosed: z.boolean(),
});

export type ToggleFiscalPeriodLockInput = z.input<
  typeof toggleFiscalPeriodLockSchema
>;

export const journalLineInputSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  type: journalLineTypeEnum,
  amount: z
    .number()
    .int("Amount must be an integer minor unit")
    .min(1, "Amount must be strictly greater than 0"),
  memo: z.string().trim().max(255).optional().nullable(),
});

export type JournalLineInput = z.input<typeof journalLineInputSchema>;

export const createJournalEntrySchema = z
  .object({
    branchId: z.string().min(1, "Branch is required"),
    entryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Entry date must be in YYYY-MM-DD format"),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters")
      .max(500, "Description cannot exceed 500 characters"),
    reference: z.string().trim().max(100).optional().nullable(),
    lines: z
      .array(journalLineInputSchema)
      .min(2, "Journal entry requires at least 2 lines"),
  })
  .superRefine((data, ctx) => {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of data.lines) {
      if (line.type === "DEBIT") {
        totalDebits += line.amount;
      } else {
        totalCredits += line.amount;
      }
    }

    if (totalDebits !== totalCredits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debit and credit totals must be equal. Total Debits: ${totalDebits}, Total Credits: ${totalCredits}`,
        path: ["lines"],
      });
    }
  });

export type CreateJournalEntryInput = z.input<typeof createJournalEntrySchema>;

export const postJournalEntrySchema = z.object({
  id: z.string().min(1, "Journal Entry ID is required"),
});

export type PostJournalEntryInput = z.input<typeof postJournalEntrySchema>;
