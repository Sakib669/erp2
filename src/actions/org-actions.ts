"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createBranchSchema,
  updateBranchSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "@/lib/validations/org";

function checkAdminOrPermission(
  user: { roles: string[]; permissions: string[] },
  permission: string
) {
  const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
  const hasPerm = isSuperAdmin || user.permissions.includes(permission);
  if (!hasPerm) {
    throw new Error(
      "FORBIDDEN: Insufficient permissions for organization management"
    );
  }
}

// -------------------------------------------------------------
// Branch Actions
// -------------------------------------------------------------

export async function createBranchAction(rawInput: CreateBranchInput) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_MANAGE");

  const parsed = createBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  // Check unique branch code
  const existingCode = await prisma.branch.findFirst({
    where: { code: data.code, deletedAt: null },
  });
  if (existingCode) {
    return {
      success: false,
      error: `Branch code '${data.code}' is already in use`,
    };
  }

  const branch = await withAuditTransaction(
    { userId: user.id, branchId: undefined },
    { action: "CREATE", entity: "Branch", entityId: "" },
    async (tx) => {
      if (data.isHeadquarters) {
        await tx.branch.updateMany({
          where: { companyId: data.companyId, isHeadquarters: true },
          data: { isHeadquarters: false },
        });
      }

      return tx.branch.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          code: data.code,
          timezone: data.timezone,
          address: data.address,
          phone: data.phone,
          email: data.email,
          isHeadquarters: data.isHeadquarters,
        },
      });
    }
  );

  revalidatePath("/org");
  revalidatePath("/", "layout");
  return { success: true, branch };
}

export async function updateBranchAction(
  branchId: string,
  rawInput: UpdateBranchInput
) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_MANAGE");

  const parsed = updateBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const existing = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Branch not found" };
  }

  const data = parsed.data;

  if (data.code && data.code !== existing.code) {
    const codeConflict = await prisma.branch.findFirst({
      where: { code: data.code, deletedAt: null, id: { not: branchId } },
    });
    if (codeConflict) {
      return {
        success: false,
        error: `Branch code '${data.code}' is already in use`,
      };
    }
  }

  const branch = await withAuditTransaction(
    { userId: user.id, branchId },
    {
      action: "UPDATE",
      entity: "Branch",
      entityId: branchId,
      before: existing,
    },
    async (tx) => {
      if (data.isHeadquarters) {
        await tx.branch.updateMany({
          where: {
            companyId: existing.companyId,
            isHeadquarters: true,
            id: { not: branchId },
          },
          data: { isHeadquarters: false },
        });
      }

      return tx.branch.update({
        where: { id: branchId },
        data,
      });
    }
  );

  revalidatePath("/org");
  revalidatePath("/", "layout");
  return { success: true, branch };
}

export async function deleteBranchAction(branchId: string) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_DELETE");

  const existing = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Branch not found" };
  }

  if (existing.isHeadquarters) {
    return {
      success: false,
      error: "Cannot delete the organization headquarters branch",
    };
  }

  await withAuditTransaction(
    { userId: user.id, branchId },
    {
      action: "DELETE",
      entity: "Branch",
      entityId: branchId,
      before: existing,
    },
    async (tx) => {
      return tx.branch.update({
        where: { id: branchId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/org");
  revalidatePath("/", "layout");
  return { success: true };
}

// -------------------------------------------------------------
// Department Actions
// -------------------------------------------------------------

export async function createDepartmentAction(rawInput: CreateDepartmentInput) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_MANAGE");

  const parsed = createDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  // Check unique department code in this branch
  const existingCode = await prisma.department.findFirst({
    where: { branchId: data.branchId, code: data.code, deletedAt: null },
  });
  if (existingCode) {
    return {
      success: false,
      error: `Department code '${data.code}' already exists in this branch`,
    };
  }

  // If parentId provided, ensure it exists in the same branch
  if (data.parentId) {
    const parent = await prisma.department.findFirst({
      where: { id: data.parentId, branchId: data.branchId, deletedAt: null },
    });
    if (!parent) {
      return {
        success: false,
        error: "Parent department not found in this branch",
      };
    }
  }

  const department = await withAuditTransaction(
    { userId: user.id, branchId: data.branchId },
    { action: "CREATE", entity: "Department", entityId: "" },
    async (tx) => {
      return tx.department.create({
        data: {
          branchId: data.branchId,
          parentId: data.parentId,
          name: data.name,
          code: data.code,
        },
      });
    }
  );

  revalidatePath("/org/departments");
  return { success: true, department };
}

export async function updateDepartmentAction(
  departmentId: string,
  rawInput: UpdateDepartmentInput
) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_MANAGE");

  const parsed = updateDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const existing = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Department not found" };
  }

  const data = parsed.data;

  if (data.code && data.code !== existing.code) {
    const codeConflict = await prisma.department.findFirst({
      where: {
        branchId: existing.branchId,
        code: data.code,
        deletedAt: null,
        id: { not: departmentId },
      },
    });
    if (codeConflict) {
      return {
        success: false,
        error: `Department code '${data.code}' already exists in this branch`,
      };
    }
  }

  if (data.parentId) {
    if (data.parentId === departmentId) {
      return { success: false, error: "A department cannot be its own parent" };
    }
    const parent = await prisma.department.findFirst({
      where: {
        id: data.parentId,
        branchId: existing.branchId,
        deletedAt: null,
      },
    });
    if (!parent) {
      return {
        success: false,
        error: "Parent department not found in this branch",
      };
    }
  }

  const department = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "UPDATE",
      entity: "Department",
      entityId: departmentId,
      before: existing,
    },
    async (tx) => {
      return tx.department.update({
        where: { id: departmentId },
        data,
      });
    }
  );

  revalidatePath("/org/departments");
  return { success: true, department };
}

export async function deleteDepartmentAction(departmentId: string) {
  const user = await requireAuth();
  checkAdminOrPermission(user, "ORG_DELETE");

  const existing = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null },
    include: {
      children: { where: { deletedAt: null } },
    },
  });

  if (!existing) {
    return { success: false, error: "Department not found" };
  }

  if (existing.children.length > 0) {
    return {
      success: false,
      error:
        "Cannot delete department with active sub-departments. Reassign or delete child departments first.",
    };
  }

  await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "DELETE",
      entity: "Department",
      entityId: departmentId,
      before: existing,
    },
    async (tx) => {
      return tx.department.update({
        where: { id: departmentId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/org/departments");
  return { success: true };
}
