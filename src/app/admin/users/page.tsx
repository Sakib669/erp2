import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { seedRbac } from "@/lib/rbac-seed";
import {
  UserManager,
  type UserItem,
  type RoleOption,
  type BranchOption,
} from "@/components/admin/user-manager";

export default async function UsersAdminPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("USER_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Ensure default roles are present
  const existingRoleCount = await prisma.role.count();
  if (existingRoleCount === 0) {
    await seedRbac(prisma);
  }

  // Fetch all active users with their role mappings and branch mappings
  const rawUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      userRoles: {
        where: { role: { deletedAt: null } },
        include: {
          role: true,
          branch: true,
        },
      },
      userBranches: {
        where: { branch: { deletedAt: null } },
        include: {
          branch: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const users: UserItem[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    activeBranchId: u.activeBranchId,
    userRoles: u.userRoles.map((ur) => ({
      id: ur.id,
      roleId: ur.roleId,
      branchId: ur.branchId,
      role: {
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        isSystem: ur.role.isSystem,
      },
      branch: ur.branch
        ? {
            id: ur.branch.id,
            name: ur.branch.name,
            code: ur.branch.code,
          }
        : null,
    })),
    userBranches: u.userBranches.map((ub) => ({
      id: ub.id,
      branchId: ub.branchId,
      isDefault: ub.isDefault,
      branch: {
        id: ub.branch.id,
        name: ub.branch.name,
        code: ub.branch.code,
      },
    })),
  }));

  // Fetch active roles for selection
  const rawRoles = await prisma.role.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, isSystem: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  const allRoles: RoleOption[] = rawRoles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    isSystem: r.isSystem,
  }));

  // Fetch active branches for selection
  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, isHeadquarters: true },
    orderBy: { name: "asc" },
  });

  const allBranches: BranchOption[] = rawBranches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }));

  return (
    <AppShell
      branches={rawBranches}
      currentBranchId={activeBranchId}
      user={
        currentUser
          ? {
              name: currentUser.name,
              email: currentUser.email,
              roles: currentUser.roles,
            }
          : undefined
      }
    >
      <div className="container mx-auto max-w-7xl space-y-6 py-6">
        <UserManager
          users={users}
          allRoles={allRoles}
          allBranches={allBranches}
          currentUserId={currentUser?.id || ""}
        />
      </div>
    </AppShell>
  );
}
