import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requirePermission(permissionCode: string) {
  const user = await requireAuth();
  const hasPermission =
    user.roles.includes("SUPER_ADMIN") ||
    user.permissions.includes(permissionCode);

  if (!hasPermission) {
    await prisma.$transaction(async (tx) => {
      await recordAudit(
        tx,
        { userId: user.id, branchId: user.activeBranchId || undefined },
        {
          action: "PERMISSION_DENIED",
          entity: "Permission",
          entityId: permissionCode,
          before: {
            requiredPermission: permissionCode,
            userRoles: user.roles,
            reason: "User lacks required permission",
          },
        }
      );
    });
    throw new Error(
      `FORBIDDEN: Missing required permission '${permissionCode}'`
    );
  }

  return user;
}

export async function requireRole(roleCode: string | string[]) {
  const user = await requireAuth();
  const requiredRoles = Array.isArray(roleCode) ? roleCode : [roleCode];
  const hasRole =
    user.roles.includes("SUPER_ADMIN") ||
    requiredRoles.some((r) => user.roles.includes(r));

  if (!hasRole) {
    await prisma.$transaction(async (tx) => {
      await recordAudit(
        tx,
        { userId: user.id, branchId: user.activeBranchId || undefined },
        {
          action: "PERMISSION_DENIED",
          entity: "Role",
          entityId: requiredRoles.join(", "),
          before: {
            requiredRoles,
            userRoles: user.roles,
            reason: "User lacks required role",
          },
        }
      );
    });
    throw new Error(
      `FORBIDDEN: Missing required role '${requiredRoles.join(", ")}'`
    );
  }

  return user;
}

export async function hasBranchPermission(
  userId: string,
  permissionCode: string,
  branchId?: string | null
): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      role: { deletedAt: null },
      OR: [
        { branchId: null }, // Global scope
        ...(branchId ? [{ branchId }] : []),
      ],
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const isSuperAdmin = userRoles.some((ur) => ur.role.code === "SUPER_ADMIN");
  if (isSuperAdmin) return true;

  return userRoles.some((ur) =>
    ur.role.permissions.some((rp) => rp.permission.code === permissionCode)
  );
}

export async function requireBranchAccess(branchId: string) {
  const user = await requireAuth();

  const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
  const hasBranch =
    isSuperAdmin || user.branches.some((b) => b.id === branchId);

  if (!hasBranch) {
    await prisma.$transaction(async (tx) => {
      await recordAudit(
        tx,
        { userId: user.id, branchId },
        {
          action: "BRANCH_ACCESS_DENIED",
          entity: "Branch",
          entityId: branchId,
          before: { reason: "User not assigned to branch" },
        }
      );
    });

    notFound();
  }

  return user;
}
