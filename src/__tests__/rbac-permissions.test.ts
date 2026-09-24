import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { seedRbac, SYSTEM_PERMISSIONS } from "@/lib/rbac-seed";
import {
  requirePermission,
  requireRole,
  hasBranchPermission,
} from "@/lib/auth-helpers";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  assignUserRoleAction,
  revokeUserRoleAction,
  updateUserStatusAction,
  adminResetPasswordAction,
  updateUserBranchesAction,
  createUserAction,
} from "@/actions/rbac-actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
const mockCookieJar: Record<string, { value: string; options?: unknown }> = {};
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn((key: string, value: string, options?: unknown) => {
      mockCookieJar[key] = { value, options };
    }),
    get: vi.fn((key: string) => mockCookieJar[key]),
    delete: vi.fn((key: string) => {
      delete mockCookieJar[key];
    }),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

// Mock auth session
interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  activeBranchId?: string | null;
  roles: string[];
  permissions: string[];
  branches: Array<{
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
  }>;
}

let mockCurrentUser: SessionUser | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (mockCurrentUser ? { user: mockCurrentUser } : null)),
}));

describe("Feature 6: RBAC and Permission Enforcement Integration", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let adminUserId: string;
  let staffUserId: string;

  beforeEach(async () => {
    // Clean up test tables in foreign key order
    await prisma.employeeTransition.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.designation.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.setting.deleteMany();
    await prisma.department.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();

    // Seed permissions and system roles
    await seedRbac(prisma);

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: "Acme Holdings Corp",
        code: "ACME-HOLDINGS",
      },
    });
    companyId = company.id;

    // Create two physical branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "North America HQ",
        code: "NA-HQ",
        timezone: "America/New_York",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Europe Hub",
        code: "EU-01",
        timezone: "Europe/London",
      },
    });
    branchBId = branchB.id;

    // Create admin user in database
    const adminUser = await prisma.user.create({
      data: {
        email: "superadmin@acme.corp",
        name: "Super Administrator",
        passwordHash: await bcrypt.hash("admin-secret-pass", 10),
        status: "ACTIVE",
        activeBranchId: branchAId,
      },
    });
    adminUserId = adminUser.id;

    // Assign SUPER_ADMIN role globally
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { code: "SUPER_ADMIN" },
    });
    await prisma.userRole.create({
      data: {
        userId: adminUserId,
        roleId: superAdminRole.id,
        branchId: null,
      },
    });
    await prisma.userBranch.create({
      data: {
        userId: adminUserId,
        branchId: branchAId,
        isDefault: true,
      },
    });

    // Create staff user in database
    const staffUser = await prisma.user.create({
      data: {
        email: "staff@acme.corp",
        name: "Regular Staff Member",
        passwordHash: await bcrypt.hash("staff-secret-pass", 10),
        status: "ACTIVE",
        activeBranchId: branchAId,
      },
    });
    staffUserId = staffUser.id;

    // Assign staff user to branch A
    await prisma.userBranch.create({
      data: {
        userId: staffUserId,
        branchId: branchAId,
        isDefault: true,
      },
    });

    // Default session: Super Admin
    mockCurrentUser = {
      id: adminUserId,
      email: "superadmin@acme.corp",
      name: "Super Administrator",
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN"],
      permissions: SYSTEM_PERMISSIONS.map((p) => p.code),
      branches: [
        {
          id: branchAId,
          name: "North America HQ",
          code: "NA-HQ",
          isDefault: true,
        },
      ],
    };
  });

  describe("Seed Data and System Role Invariants (AC-1, AC-2)", () => {
    it("seeds 21 permissions and 5 immutable system roles idempotently", async () => {
      const perms = await prisma.permission.findMany();
      expect(perms.length).toBe(21);

      const roles = await prisma.role.findMany();
      expect(roles.length).toBe(5);

      const roleCodes = roles.map((r) => r.code);
      expect(roleCodes).toContain("SUPER_ADMIN");
      expect(roleCodes).toContain("BRANCH_MANAGER");
      expect(roleCodes).toContain("HR_MANAGER");
      expect(roleCodes).toContain("FINANCE_MANAGER");
      expect(roleCodes).toContain("EMPLOYEE");

      // Verify idempotency
      const secondSeed = await seedRbac(prisma);
      expect(secondSeed.permissionsCount).toBe(21);
      expect(secondSeed.rolesCount).toBe(5);
    });

    it("prevents deleting an immutable system role", async () => {
      const superAdminRole = await prisma.role.findUniqueOrThrow({
        where: { code: "SUPER_ADMIN" },
      });

      const res = await deleteRoleAction(superAdminRole.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Protected system roles cannot be deleted");

      // Role remains in database
      const dbRole = await prisma.role.findUnique({
        where: { id: superAdminRole.id },
      });
      expect(dbRole?.deletedAt).toBeNull();
    });

    it("prevents changing the name of an immutable system role", async () => {
      const branchManagerRole = await prisma.role.findUniqueOrThrow({
        where: { code: "BRANCH_MANAGER" },
      });

      const res = await updateRoleAction(branchManagerRole.id, {
        name: "Altered Name",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("System role names are immutable");
    });
  });

  describe("Custom Role Management & Audit Trail (AC-3)", () => {
    it("creates a custom role with modular permissions and transactional audit log", async () => {
      const orgPerms = await prisma.permission.findMany({
        where: { module: "ORG" },
      });
      const permIds = orgPerms.map((p) => p.id);

      const res = await createRoleAction({
        name: "Branch Auditor",
        code: "BRANCH_AUDITOR",
        description: "Audit role for physical branch inspection",
        permissionIds: permIds,
      });

      expect(res.success).toBe(true);
      if (!res.success) return;

      expect(res.role?.name).toBe("Branch Auditor");
      expect(res.role?.code).toBe("BRANCH_AUDITOR");
      expect(res.role?.isSystem).toBe(false);
      expect(res.role?.permissions.length).toBe(orgPerms.length);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Role",
          action: "CREATE",
          entityId: res.role?.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(adminUserId);
    });

    it("prevents creating custom role with duplicate code", async () => {
      const orgPerms = await prisma.permission.findMany();

      const res = await createRoleAction({
        name: "Duplicate Super Admin",
        code: "SUPER_ADMIN",
        permissionIds: [orgPerms[0].id],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("is already in use");
    });

    it("updates custom role details and permission matrix", async () => {
      const orgPerms = await prisma.permission.findMany({
        where: { module: "ORG" },
      });
      const createRes = await createRoleAction({
        name: "Inventory Specialist",
        code: "INV_SPEC",
        permissionIds: [orgPerms[0].id],
      });
      const roleId = createRes.role!.id;

      // Update with all ORG permissions
      const updateRes = await updateRoleAction(roleId, {
        name: "Senior Inventory Specialist",
        description: "Updated responsibilities",
        permissionIds: orgPerms.map((p) => p.id),
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.role?.name).toBe("Senior Inventory Specialist");
      expect(updateRes.role?.permissions.length).toBe(orgPerms.length);

      // Audit log records UPDATE action
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Role",
          action: "UPDATE",
          entityId: roleId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("soft deletes custom role and blocks deletion when active users are assigned", async () => {
      const orgPerms = await prisma.permission.findMany();
      const createRes = await createRoleAction({
        name: "Temporary Role",
        code: "TEMP_ROLE",
        permissionIds: [orgPerms[0].id],
      });
      const roleId = createRes.role!.id;

      // Assign to staff user
      await assignUserRoleAction({
        userId: staffUserId,
        roleId,
      });

      // Attempt to delete role with assigned users must fail
      const deleteFailRes = await deleteRoleAction(roleId);
      expect(deleteFailRes.success).toBe(false);
      expect(deleteFailRes.error).toContain("active user assignment");

      // Revoke role from user
      const userRole = await prisma.userRole.findFirstOrThrow({
        where: { userId: staffUserId, roleId },
      });
      await revokeUserRoleAction(userRole.id);

      // Now deletion succeeds
      const deleteSuccessRes = await deleteRoleAction(roleId);
      expect(deleteSuccessRes.success).toBe(true);

      const dbRole = await prisma.role.findUnique({ where: { id: roleId } });
      expect(dbRole?.deletedAt).not.toBeNull();
    });
  });

  describe("User Role Scoping & Permission Evaluation (AC-4, AC-6)", () => {
    it("assigns role globally and evaluates permissions across branches", async () => {
      const financeRole = await prisma.role.findUniqueOrThrow({
        where: { code: "FINANCE_MANAGER" },
      });

      const assignRes = await assignUserRoleAction({
        userId: staffUserId,
        roleId: financeRole.id,
        branchId: null, // Global scope
      });

      expect(assignRes.success).toBe(true);
      expect(assignRes.userRole?.branchId).toBeNull();

      // Check hasBranchPermission evaluates true across both branches
      const canViewAccountsA = await hasBranchPermission(
        staffUserId,
        "ACCOUNTS_VIEW",
        branchAId
      );
      expect(canViewAccountsA).toBe(true);

      const canViewAccountsB = await hasBranchPermission(
        staffUserId,
        "ACCOUNTS_VIEW",
        branchBId
      );
      expect(canViewAccountsB).toBe(true);
    });

    it("scopes role to physical branch and enforces access boundary", async () => {
      const branchManagerRole = await prisma.role.findUniqueOrThrow({
        where: { code: "BRANCH_MANAGER" },
      });

      // Grant Branch Manager strictly to Branch A
      const assignRes = await assignUserRoleAction({
        userId: staffUserId,
        roleId: branchManagerRole.id,
        branchId: branchAId,
      });

      expect(assignRes.success).toBe(true);
      expect(assignRes.userRole?.branchId).toBe(branchAId);

      // Permission evaluates true for Branch A
      const canManageBranchA = await hasBranchPermission(
        staffUserId,
        "HR_MANAGE",
        branchAId
      );
      expect(canManageBranchA).toBe(true);

      // Permission evaluates false for Branch B
      const canManageBranchB = await hasBranchPermission(
        staffUserId,
        "HR_MANAGE",
        branchBId
      );
      expect(canManageBranchB).toBe(false);
    });

    it("prevents duplicate role assignment within the same scope", async () => {
      const employeeRole = await prisma.role.findUniqueOrThrow({
        where: { code: "EMPLOYEE" },
      });

      await assignUserRoleAction({
        userId: staffUserId,
        roleId: employeeRole.id,
        branchId: branchAId,
      });

      const dupRes = await assignUserRoleAction({
        userId: staffUserId,
        roleId: employeeRole.id,
        branchId: branchAId,
      });

      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already has this role assigned");
    });

    it("prevents revoking the only Super Administrator in the system", async () => {
      const adminRole = await prisma.userRole.findFirstOrThrow({
        where: { userId: adminUserId, role: { code: "SUPER_ADMIN" } },
      });

      const res = await revokeUserRoleAction(adminRole.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain(
        "cannot revoke your own Super Administrator access"
      );
    });

    it("requirePermission rejects unauthorized caller and logs PERMISSION_DENIED", async () => {
      // Act as staff member without ROLE_MANAGE permission
      mockCurrentUser = {
        id: staffUserId,
        email: "staff@acme.corp",
        name: "Staff Member",
        roles: ["EMPLOYEE"],
        permissions: ["AUTH_LOGIN", "AUTH_2FA_MANAGE"],
        branches: [],
      };

      await expect(requirePermission("ROLE_MANAGE")).rejects.toThrow(
        "FORBIDDEN: Missing required permission 'ROLE_MANAGE'"
      );

      // Verify security audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "PERMISSION_DENIED",
          entity: "Permission",
          entityId: "ROLE_MANAGE",
          userId: staffUserId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("requireRole rejects unauthorized caller and logs PERMISSION_DENIED", async () => {
      // Act as staff member without SUPER_ADMIN
      mockCurrentUser = {
        id: staffUserId,
        email: "staff@acme.corp",
        name: "Staff Member",
        roles: ["EMPLOYEE"],
        permissions: [],
        branches: [],
      };

      await expect(requireRole("SUPER_ADMIN")).rejects.toThrow(
        "FORBIDDEN: Missing required role 'SUPER_ADMIN'"
      );

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "PERMISSION_DENIED",
          entity: "Role",
          entityId: "SUPER_ADMIN",
          userId: staffUserId,
        },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("User Lifecycle & Account Management (AC-5)", () => {
    it("creates a new staff member with branch and role assignments", async () => {
      const employeeRole = await prisma.role.findUniqueOrThrow({
        where: { code: "EMPLOYEE" },
      });

      const res = await createUserAction({
        name: "Alice Walker",
        email: "a.walker@acme.corp",
        password: "secure-temporary-password",
        branchIds: [branchAId, branchBId],
        defaultBranchId: branchAId,
        roleIds: [employeeRole.id],
      });

      expect(res.success).toBe(true);
      if (!res.success) return;

      const newUser = await prisma.user.findUnique({
        where: { id: res.user?.id },
        include: {
          userBranches: true,
          userRoles: true,
        },
      });

      expect(newUser).not.toBeNull();
      expect(newUser?.name).toBe("Alice Walker");
      expect(newUser?.status).toBe("ACTIVE");
      expect(newUser?.userBranches.length).toBe(2);
      expect(newUser?.userRoles.length).toBe(1);
    });

    it("toggles user status and prevents self suspension", async () => {
      // Admin attempts to suspend themselves -> rejected
      const selfSuspend = await updateUserStatusAction({
        userId: adminUserId,
        status: "SUSPENDED",
      });
      expect(selfSuspend.success).toBe(false);
      expect(selfSuspend.error).toContain(
        "cannot suspend your own administrative account"
      );

      // Admin suspends staff member -> succeeds
      const suspendRes = await updateUserStatusAction({
        userId: staffUserId,
        status: "SUSPENDED",
      });
      expect(suspendRes.success).toBe(true);

      const suspendedUser = await prisma.user.findUnique({
        where: { id: staffUserId },
      });
      expect(suspendedUser?.status).toBe("SUSPENDED");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "User",
          action: "UPDATE_STATUS",
          entityId: staffUserId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("resets staff member password with hash update and audit log", async () => {
      const res = await adminResetPasswordAction({
        userId: staffUserId,
        newPassword: "BrandNewSecurePassword123",
      });

      expect(res.success).toBe(true);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: staffUserId },
      });
      const passwordMatches = await bcrypt.compare(
        "BrandNewSecurePassword123",
        user.passwordHash
      );
      expect(passwordMatches).toBe(true);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "User",
          action: "ADMIN_PASSWORD_RESET",
          entityId: staffUserId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("updates user branch memberships and default branch", async () => {
      const res = await updateUserBranchesAction({
        userId: staffUserId,
        branchIds: [branchBId],
        defaultBranchId: branchBId,
      });

      expect(res.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { id: staffUserId },
        include: { userBranches: true },
      });
      expect(user?.userBranches.length).toBe(1);
      expect(user?.userBranches[0].branchId).toBe(branchBId);
      expect(user?.activeBranchId).toBe(branchBId);
    });
  });
});
