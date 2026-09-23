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
    throw new Error("FORBIDDEN: Insufficient permissions");
  }

  return user;
}

export async function requireBranchAccess(branchId: string) {
  const user = await requireAuth();

  const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
  const hasBranch = isSuperAdmin || user.branches.some((b) => b.id === branchId);

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
