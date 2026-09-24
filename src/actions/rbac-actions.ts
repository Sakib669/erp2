"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createRoleSchema,
  updateRoleSchema,
  assignUserRoleSchema,
  updateUserStatusSchema,
  adminResetPasswordSchema,
  updateUserBranchesSchema,
  createUserSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
  type AssignUserRoleInput,
  type UpdateUserStatusInput,
  type AdminResetPasswordInput,
  type UpdateUserBranchesInput,
  type CreateUserInput,
} from "@/lib/validations/rbac";

// -------------------------------------------------------------
// Role Actions
// -------------------------------------------------------------

export async function createRoleAction(rawInput: CreateRoleInput) {
  const user = await requireAuth();
  await requirePermission("ROLE_MANAGE");

  const parsed = createRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  // Check unique role code
  const existingCode = await prisma.role.findFirst({
    where: { code: data.code, deletedAt: null },
  });
  if (existingCode) {
    return {
      success: false,
      error: `Role code '${data.code}' is already in use`,
    };
  }

  const role = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "Role", entityId: "" },
    async (tx) => {
      const createdRole = await tx.role.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          isSystem: false,
        },
      });

      // Attach permissions
      for (const permissionId of data.permissionIds) {
        await tx.rolePermission.create({
          data: {
            roleId: createdRole.id,
            permissionId,
          },
        });
      }

      return tx.role.findUnique({
        where: { id: createdRole.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    }
  );

  revalidatePath("/admin/roles");
  return { success: true, role };
}

export async function updateRoleAction(
  roleId: string,
  rawInput: UpdateRoleInput
) {
  const user = await requireAuth();
  await requirePermission("ROLE_MANAGE");

  const parsed = updateRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const existing = await prisma.role.findFirst({
    where: { id: roleId, deletedAt: null },
    include: {
      permissions: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Role not found" };
  }

  const data = parsed.data;

  // System role guards: cannot rename or alter system code
  if (existing.isSystem && data.name && data.name !== existing.name) {
    return { success: false, error: "System role names are immutable" };
  }

  const role = await withAuditTransaction(
    { userId: user.id },
    {
      action: "UPDATE",
      entity: "Role",
      entityId: roleId,
      before: existing,
    },
    async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: {
          name: existing.isSystem ? existing.name : data.name,
          description:
            data.description !== undefined
              ? data.description
              : existing.description,
        },
      });

      if (data.permissionIds) {
        // Remove previous permissions and attach new selection
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        for (const permissionId of data.permissionIds) {
          await tx.rolePermission.create({
            data: {
              roleId,
              permissionId,
            },
          });
        }
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    }
  );

  revalidatePath("/admin/roles");
  return { success: true, role };
}

export async function deleteRoleAction(roleId: string) {
  const user = await requireAuth();
  await requirePermission("ROLE_DELETE");

  const existing = await prisma.role.findFirst({
    where: { id: roleId, deletedAt: null },
    include: {
      userRoles: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Role not found" };
  }

  if (existing.isSystem) {
    return {
      success: false,
      error: "Protected system roles cannot be deleted",
    };
  }

  if (existing.userRoles.length > 0) {
    return {
      success: false,
      error: `Cannot delete role with ${existing.userRoles.length} active user assignment(s). Reassign users before deleting.`,
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    {
      action: "DELETE",
      entity: "Role",
      entityId: roleId,
      before: existing,
    },
    async (tx) => {
      return tx.role.update({
        where: { id: roleId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/admin/roles");
  return { success: true };
}

// -------------------------------------------------------------
// User Role Assignment Actions
// -------------------------------------------------------------

export async function assignUserRoleAction(rawInput: AssignUserRoleInput) {
  const admin = await requireAuth();
  await requirePermission("USER_ASSIGN_ROLE");

  const parsed = assignUserRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { userId, roleId, branchId } = parsed.data;

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!targetUser) {
    return { success: false, error: "Target user not found" };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, deletedAt: null },
  });
  if (!role) {
    return { success: false, error: "Role not found" };
  }

  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) {
      return { success: false, error: "Branch not found" };
    }
  }

  // Check if role is already assigned in this scope
  const existingAssignment = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
      branchId: branchId ?? null,
    },
  });
  if (existingAssignment) {
    return {
      success: false,
      error: "User already has this role assigned in this scope",
    };
  }

  const userRole = await withAuditTransaction(
    { userId: admin.id, branchId: branchId ?? undefined },
    {
      action: "ASSIGN_ROLE",
      entity: "UserRole",
      entityId: "",
      after: { userId, roleId, branchId: branchId ?? null },
    },
    async (tx) => {
      return tx.userRole.create({
        data: {
          userId,
          roleId,
          branchId: branchId ?? null,
        },
        include: {
          role: true,
          branch: true,
        },
      });
    }
  );

  revalidatePath("/admin/users");
  return { success: true, userRole };
}

export async function revokeUserRoleAction(userRoleId: string) {
  const admin = await requireAuth();
  await requirePermission("USER_ASSIGN_ROLE");

  const existing = await prisma.userRole.findUnique({
    where: { id: userRoleId },
    include: {
      role: true,
      user: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Role assignment not found" };
  }

  // Guard: prevent user from revoking their own SUPER_ADMIN role
  if (admin.id === existing.userId && existing.role.code === "SUPER_ADMIN") {
    return {
      success: false,
      error: "You cannot revoke your own Super Administrator access",
    };
  }

  // Guard: prevent revoking the last SUPER_ADMIN in the system
  if (existing.role.code === "SUPER_ADMIN") {
    const superAdminCount = await prisma.userRole.count({
      where: {
        role: { code: "SUPER_ADMIN" },
        user: { status: "ACTIVE", deletedAt: null },
      },
    });
    if (superAdminCount <= 1) {
      return {
        success: false,
        error:
          "Cannot revoke the only active Super Administrator in the system",
      };
    }
  }

  await withAuditTransaction(
    { userId: admin.id, branchId: existing.branchId ?? undefined },
    {
      action: "REVOKE_ROLE",
      entity: "UserRole",
      entityId: userRoleId,
      before: existing,
    },
    async (tx) => {
      return tx.userRole.delete({
        where: { id: userRoleId },
      });
    }
  );

  revalidatePath("/admin/users");
  return { success: true };
}

// -------------------------------------------------------------
// User Lifecycle & Account Management Actions
// -------------------------------------------------------------

export async function updateUserStatusAction(rawInput: UpdateUserStatusInput) {
  const admin = await requireAuth();
  await requirePermission("USER_MANAGE");

  const parsed = updateUserStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { userId, status } = parsed.data;

  if (admin.id === userId && status === "SUSPENDED") {
    return {
      success: false,
      error: "You cannot suspend your own administrative account",
    };
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "User not found" };
  }

  const updatedUser = await withAuditTransaction(
    { userId: admin.id },
    {
      action: "UPDATE_STATUS",
      entity: "User",
      entityId: userId,
      before: { status: existing.status },
      after: { status },
    },
    async (tx) => {
      return tx.user.update({
        where: { id: userId },
        data: { status },
      });
    }
  );

  revalidatePath("/admin/users");
  return { success: true, user: updatedUser };
}

export async function adminResetPasswordAction(
  rawInput: AdminResetPasswordInput
) {
  const admin = await requireAuth();
  await requirePermission("USER_MANAGE");

  const parsed = adminResetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { userId, newPassword } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!existing) {
    return { success: false, error: "User not found" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await withAuditTransaction(
    { userId: admin.id },
    {
      action: "ADMIN_PASSWORD_RESET",
      entity: "User",
      entityId: userId,
      after: { resetByAdminId: admin.id, targetEmail: existing.email },
    },
    async (tx) => {
      return tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    }
  );

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserBranchesAction(
  rawInput: UpdateUserBranchesInput
) {
  const admin = await requireAuth();
  await requirePermission("USER_MANAGE");

  const parsed = updateUserBranchesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { userId, branchIds, defaultBranchId } = parsed.data;

  if (!branchIds.includes(defaultBranchId)) {
    return {
      success: false,
      error: "Default branch must be included in assigned branches",
    };
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { userBranches: true },
  });
  if (!existing) {
    return { success: false, error: "User not found" };
  }

  await withAuditTransaction(
    { userId: admin.id },
    {
      action: "UPDATE_BRANCHES",
      entity: "User",
      entityId: userId,
      before: existing.userBranches,
      after: { branchIds, defaultBranchId },
    },
    async (tx) => {
      // Delete old assignments
      await tx.userBranch.deleteMany({
        where: { userId },
      });

      // Insert new assignments
      for (const branchId of branchIds) {
        await tx.userBranch.create({
          data: {
            userId,
            branchId,
            isDefault: branchId === defaultBranchId,
          },
        });
      }

      // Update activeBranchId if current is no longer assigned
      const isCurrentValid =
        existing.activeBranchId && branchIds.includes(existing.activeBranchId);
      if (!isCurrentValid) {
        await tx.user.update({
          where: { id: userId },
          data: { activeBranchId: defaultBranchId },
        });
      }
    }
  );

  revalidatePath("/admin/users");
  return { success: true };
}

export async function createUserAction(rawInput: CreateUserInput) {
  const admin = await requireAuth();
  await requirePermission("USER_MANAGE");

  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  if (!data.branchIds.includes(data.defaultBranchId)) {
    return {
      success: false,
      error: "Default branch must be one of the assigned branches",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    return {
      success: false,
      error: `Email '${data.email}' is already registered`,
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser = await withAuditTransaction(
    { userId: admin.id },
    {
      action: "CREATE",
      entity: "User",
      entityId: "",
      after: { email: data.email, name: data.name },
    },
    async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          activeBranchId: data.defaultBranchId,
          status: "ACTIVE",
        },
      });

      for (const branchId of data.branchIds) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId,
            isDefault: branchId === data.defaultBranchId,
          },
        });
      }

      for (const roleId of data.roleIds) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId,
            branchId: null, // Default global scope
          },
        });
      }

      return user;
    }
  );

  revalidatePath("/admin/users");
  return { success: true, user: newUser };
}
