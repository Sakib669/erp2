"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function setActiveBranchAction(branchId: string) {
  const user = await getCurrentUser();
  const cookieStore = await cookies();

  // Validate that branch exists
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true, code: true },
  });

  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  // If user is authenticated, check branch assignment unless super admin
  if (user) {
    const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
    const hasBranch =
      isSuperAdmin || user.branches.some((b) => b.id === branchId);

    if (!hasBranch) {
      // Audit unauthorized switch attempt
      await prisma.$transaction(async (tx) => {
        await recordAudit(
          tx,
          { userId: user.id, branchId },
          {
            action: "BRANCH_ACCESS_DENIED",
            entity: "Branch",
            entityId: branchId,
            before: { reason: "User attempted to switch to unassigned branch" },
          }
        );
      });
      return { success: false, error: "Unauthorized branch access" };
    }

    // Update active branch on user record
    await prisma.user.update({
      where: { id: user.id },
      data: { activeBranchId: branchId },
    });
  }

  // Set active_branch_id cookie
  cookieStore.set("active_branch_id", branchId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  revalidatePath("/", "layout");
  return { success: true, branch };
}
