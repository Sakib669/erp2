import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Role code must be at least 2 characters")
    .max(50)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Role code must contain only uppercase letters, numbers, hyphens, and underscores"
    ),
  description: z.string().max(500).optional().nullable(),
  permissionIds: z
    .array(z.string())
    .min(1, "A role must include at least one permission"),
});

export type CreateRoleInput = z.input<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(100)
    .optional(),
  description: z.string().max(500).optional().nullable(),
  permissionIds: z
    .array(z.string())
    .min(1, "A role must include at least one permission")
    .optional(),
});

export type UpdateRoleInput = z.input<typeof updateRoleSchema>;

export const assignUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  roleId: z.string().min(1, "Role ID is required"),
  branchId: z.string().optional().nullable(),
});

export type AssignUserRoleInput = z.input<typeof assignUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]),
});

export type UpdateUserStatusInput = z.input<typeof updateUserStatusSchema>;

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export type AdminResetPasswordInput = z.input<typeof adminResetPasswordSchema>;

export const updateUserBranchesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  branchIds: z
    .array(z.string())
    .min(1, "User must have at least one assigned branch"),
  defaultBranchId: z.string().min(1, "Default branch is required"),
});

export type UpdateUserBranchesInput = z.input<typeof updateUserBranchesSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  branchIds: z
    .array(z.string())
    .min(1, "User must have at least one assigned branch"),
  defaultBranchId: z.string().min(1, "Default branch is required"),
  roleIds: z
    .array(z.string())
    .min(1, "User must be assigned at least one role"),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
