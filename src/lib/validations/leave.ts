import { z } from "zod";

export const leaveRequestStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const createLeaveTypeSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  description: z.string().max(500).optional().nullable(),
  defaultDaysPerYear: z
    .number()
    .int()
    .min(0, "Default days cannot be negative")
    .max(365, "Default days cannot exceed 365")
    .default(14),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  carryForwardMaxDays: z
    .number()
    .int()
    .min(0, "Carry forward days cannot be negative")
    .max(60, "Carry forward cannot exceed 60 days")
    .default(0),
});

export type CreateLeaveTypeInput = z.input<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = z.object({
  id: z.string().min(1, "Leave Type ID is required"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    )
    .optional(),
  description: z.string().max(500).optional().nullable(),
  defaultDaysPerYear: z
    .number()
    .int()
    .min(0, "Default days cannot be negative")
    .max(365, "Default days cannot exceed 365")
    .optional(),
  isPaid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  carryForwardMaxDays: z
    .number()
    .int()
    .min(0, "Carry forward days cannot be negative")
    .max(60, "Carry forward cannot exceed 60 days")
    .optional(),
});

export type UpdateLeaveTypeInput = z.input<typeof updateLeaveTypeSchema>;

export const submitLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveTypeId: z.string().min(1, "Leave Type is required"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  daysCount: z
    .number()
    .int()
    .min(1, "At least 1 day must be requested")
    .max(180, "Cannot request more than 180 consecutive days"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type SubmitLeaveRequestInput = z.input<typeof submitLeaveRequestSchema>;

export const approveLeaveRequestSchema = z.object({
  id: z.string().min(1, "Request ID is required"),
  approvalNotes: z.string().max(500).optional().nullable(),
});

export type ApproveLeaveRequestInput = z.input<
  typeof approveLeaveRequestSchema
>;

export const rejectLeaveRequestSchema = z.object({
  id: z.string().min(1, "Request ID is required"),
  rejectionReason: z
    .string()
    .trim()
    .min(3, "Rejection explanation must be at least 3 characters")
    .max(500, "Rejection explanation cannot exceed 500 characters"),
});

export type RejectLeaveRequestInput = z.input<typeof rejectLeaveRequestSchema>;

export const allocateLeaveBalanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveTypeId: z.string().min(1, "Leave Type is required"),
  year: z.number().int().min(2020).max(2100),
  entitledDays: z
    .number()
    .int()
    .min(0, "Entitled days cannot be negative")
    .max(365),
  carriedForwardDays: z.number().int().min(0).max(60).default(0),
});

export type AllocateLeaveBalanceInput = z.input<
  typeof allocateLeaveBalanceSchema
>;
