import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { seedRbac } from "@/lib/rbac-seed";
import {
  RoleManager,
  type RoleRecord,
  type PermissionRecord,
} from "@/components/admin/role-manager";

export default async function RolesAdminPage() {
  const user = await getCurrentUser();
  await requirePermission("ROLE_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Ensure default roles and permissions are seeded
  const existingRoleCount = await prisma.role.count();
  if (existingRoleCount === 0) {
    await seedRbac(prisma);
  }

  // Fetch all active roles with assigned permissions and user counts
  const rawRoles = await prisma.role.findMany({
    where: { deletedAt: null },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      userRoles: true,
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  const roles: RoleRecord[] = rawRoles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r.userRoles.length,
    permissions: r.permissions.map((rp) => ({
      permissionId: rp.permissionId,
      permission: {
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        module: rp.permission.module,
        description: rp.permission.description,
      },
    })),
  }));

  // Fetch all available permissions grouped
  const rawPermissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
  });

  const allPermissions: PermissionRecord[] = rawPermissions.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    module: p.module,
    description: p.description,
  }));

  // Fetch all active branches for shell context
  const branches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, isHeadquarters: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      branches={branches}
      currentBranchId={activeBranchId}
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              roles: user.roles,
            }
          : undefined
      }
    >
      <div className="container mx-auto max-w-7xl space-y-6 py-6">
        <RoleManager roles={roles} allPermissions={allPermissions} />
      </div>
    </AppShell>
  );
}
