import { z } from "zod";

export const createDesignationSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title cannot exceed 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  description: z.string().max(500).optional().nullable(),
});

export type CreateDesignationInput = z.input<typeof createDesignationSchema>;

export const updateDesignationSchema = z.object({
  id: z.string().min(1, "Designation ID is required"),
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title cannot exceed 100 characters")
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
});

export type UpdateDesignationInput = z.input<typeof updateDesignationSchema>;

export const createShiftSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
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
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format"),
  gracePeriodMinutes: z
    .number()
    .int()
    .min(0, "Grace period cannot be negative")
    .max(120, "Grace period cannot exceed 120 minutes")
    .default(15),
});

export type CreateShiftInput = z.input<typeof createShiftSchema>;

export const updateShiftSchema = z.object({
  id: z.string().min(1, "Shift ID is required"),
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
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
    .optional(),
  gracePeriodMinutes: z
    .number()
    .int()
    .min(0, "Grace period cannot be negative")
    .max(120, "Grace period cannot exceed 120 minutes")
    .optional(),
});

export type UpdateShiftInput = z.input<typeof updateShiftSchema>;

export const employeeStatusEnum = z.enum([
  "ACTIVE",
  "PROBATION",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
]);

export const employmentTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
]);

export const transitionTypeEnum = z.enum([
  "HIRED",
  "PROMOTION",
  "TRANSFER",
  "DEPARTMENT_CHANGE",
  "SALARY_ADJUSTMENT",
  "SUSPENSION",
  "RESIGNATION",
  "TERMINATION",
]);

export const createEmployeeSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  branchId: z.string().min(1, "Branch is required"),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  shiftId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  employeeNumber: z
    .string()
    .min(2, "Employee number must be at least 2 characters")
    .max(50, "Employee number cannot exceed 50 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(30).optional().nullable(),
  dateOfBirth: z.string().or(z.date()).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  joinDate: z.string().or(z.date()),
  confirmationDate: z.string().or(z.date()).optional().nullable(),
  status: employeeStatusEnum.default("ACTIVE"),
  employmentType: employmentTypeEnum.default("FULL_TIME"),
  baseSalary: z
    .number()
    .int("Salary must be an integer in minor units")
    .min(0, "Salary cannot be negative"),
  bankName: z.string().max(100).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  emergencyContact: z.string().max(200).optional().nullable(),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
  branchId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  designationId: z.string().min(1).optional(),
  shiftId: z.string().optional().nullable(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().max(30).optional().nullable(),
  dateOfBirth: z.string().or(z.date()).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  joinDate: z.string().or(z.date()).optional(),
  confirmationDate: z.string().or(z.date()).optional().nullable(),
  status: employeeStatusEnum.optional(),
  employmentType: employmentTypeEnum.optional(),
  baseSalary: z
    .number()
    .int("Salary must be an integer in minor units")
    .min(0, "Salary cannot be negative")
    .optional(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  emergencyContact: z.string().max(200).optional().nullable(),
});

export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;

export const recordEmployeeTransitionSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  transitionType: transitionTypeEnum,
  effectiveDate: z.string().or(z.date()),
  toBranchId: z.string().optional().nullable(),
  toDepartmentId: z.string().optional().nullable(),
  toDesignationId: z.string().optional().nullable(),
  newSalary: z
    .number()
    .int("Salary must be an integer in minor units")
    .min(0, "Salary cannot be negative")
    .optional()
    .nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

export type RecordEmployeeTransitionInput = z.input<
  typeof recordEmployeeTransitionSchema
>;
