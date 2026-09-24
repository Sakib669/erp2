import { z } from "zod";

export const companySchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100),
  code: z
    .string()
    .min(2, "Company code must be at least 2 characters")
    .max(10)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  currency: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .default("USD"),
  timezone: z.string().default("UTC"),
});

export type CompanyInput = z.input<typeof companySchema>;

export const createBranchSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z.string().min(2, "Branch name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Branch code must be at least 2 characters")
    .max(10)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  timezone: z.string().default("UTC"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  isHeadquarters: z.boolean().default(false),
});

export type CreateBranchInput = z.input<typeof createBranchSchema>;

export const updateBranchSchema = createBranchSchema
  .partial()
  .omit({ companyId: true });

export type UpdateBranchInput = z.input<typeof updateBranchSchema>;

export const createDepartmentSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  parentId: z.string().optional().nullable(),
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
});

export type CreateDepartmentInput = z.input<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100)
    .optional(),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(10)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must contain only uppercase letters, numbers, hyphens, and underscores"
    )
    .optional(),
  parentId: z.string().optional().nullable(),
});

export type UpdateDepartmentInput = z.input<typeof updateDepartmentSchema>;
