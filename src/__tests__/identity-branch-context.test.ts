import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import { generateSync } from "otplib";
import {
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "@/actions/org-actions";
import {
  setupTwoFactorAction,
  confirmTwoFactorAction,
  resetUserTwoFactorAction,
} from "@/actions/auth-actions";
import { setActiveBranchAction } from "@/actions/branch-actions";

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

// Mock auth helpers with a configurable current user
interface TestUserSession {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  permissions: string[];
  branches: Array<{
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
  }>;
}

let currentAuthUser: TestUserSession | null = null;

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(async () => currentAuthUser),
  requireAuth: vi.fn(async () => {
    if (!currentAuthUser) {
      throw new Error("UNAUTHENTICATED");
    }
    return currentAuthUser;
  }),
}));

describe("Feature 5: Identity, Auth & Branch Context Integration", () => {
  let companyId: string;
  let hqBranchId: string;
  let testUserId: string;
  let regularUserId: string;

  beforeEach(async () => {
    // Clean up test data in foreign key order
    await cleanDatabase();

    // Create test company
    const company = await prisma.company.create({
      data: {
        name: "Acme Global Enterprise",
        code: "ACME-GLOBAL",
      },
    });
    companyId = company.id;

    // Create headquarters branch
    const hq = await prisma.branch.create({
      data: {
        companyId,
        name: "Acme HQ New York",
        code: "NYC-HQ",
        timezone: "America/New_York",
        isHeadquarters: true,
      },
    });
    hqBranchId = hq.id;

    // Create super admin user in database
    const adminUser = await prisma.user.create({
      data: {
        email: "superadmin@acme.corp",
        name: "Super Administrator",
        passwordHash: "hash-admin",
      },
    });
    testUserId = adminUser.id;

    // Create regular user in database
    const regularUser = await prisma.user.create({
      data: {
        email: "operator@acme.corp",
        name: "Branch Operator",
        passwordHash: "hash-operator",
      },
    });
    regularUserId = regularUser.id;

    // Assign regular user to HQ branch only
    await prisma.userBranch.create({
      data: {
        userId: regularUserId,
        branchId: hqBranchId,
        isDefault: true,
      },
    });

    // Default auth session: Super Admin
    currentAuthUser = {
      id: testUserId,
      email: "superadmin@acme.corp",
      name: "Super Administrator",
      roles: ["SUPER_ADMIN"],
      permissions: ["ORG_MANAGE", "ORG_DELETE"],
      branches: [
        {
          id: hqBranchId,
          name: "Acme HQ New York",
          code: "NYC-HQ",
          isDefault: true,
        },
      ],
    };
  });

  describe("Branch Management & Soft Delete (AC-2, AC-3, AC-4)", () => {
    it("creates a new physical branch and records transactional audit log", async () => {
      const res = await createBranchAction({
        companyId,
        name: "London Regional Office",
        code: "LDN-01",
        timezone: "Europe/London",
        address: "100 Bishopsgate, London",
        isHeadquarters: false,
      });

      expect(res.success).toBe(true);
      if (!res.success) return;

      expect(res.branch?.code).toBe("LDN-01");
      expect(res.branch?.timezone).toBe("Europe/London");

      // Verify branch is queryable in database
      const dbBranch = await prisma.branch.findUnique({
        where: { id: res.branch?.id },
      });
      expect(dbBranch).not.toBeNull();
      expect(dbBranch?.name).toBe("London Regional Office");
      expect(dbBranch?.deletedAt).toBeNull();

      // Verify transactional audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Branch",
          action: "CREATE",
          entityId: res.branch?.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(testUserId);
    });

    it("prevents creating branch with duplicate code", async () => {
      const res = await createBranchAction({
        companyId,
        name: "Duplicate HQ Code Branch",
        code: "NYC-HQ",
        timezone: "America/New_York",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("is already in use");
    });

    it("updates branch details and switches headquarters atomically", async () => {
      const createRes = await createBranchAction({
        companyId,
        name: "Tokyo Operations",
        code: "TYO-01",
        timezone: "Asia/Tokyo",
        isHeadquarters: false,
      });
      expect(createRes.success).toBe(true);
      const tokyoId = createRes.branch!.id;

      // Promote Tokyo to headquarters
      const updateRes = await updateBranchAction(tokyoId, {
        name: "Tokyo Global HQ",
        isHeadquarters: true,
      });
      expect(updateRes.success).toBe(true);

      // Verify Tokyo is now headquarters
      const updatedTokyo = await prisma.branch.findUnique({
        where: { id: tokyoId },
      });
      expect(updatedTokyo?.isHeadquarters).toBe(true);
      expect(updatedTokyo?.name).toBe("Tokyo Global HQ");

      // Verify NYC HQ was demoted atomically
      const nycBranch = await prisma.branch.findUnique({
        where: { id: hqBranchId },
      });
      expect(nycBranch?.isHeadquarters).toBe(false);

      // Verify audit trail for update
      const updateAudit = await prisma.auditLog.findFirst({
        where: {
          entity: "Branch",
          action: "UPDATE",
          entityId: tokyoId,
        },
      });
      expect(updateAudit).not.toBeNull();
      expect(updateAudit?.before).toBeDefined();
    });

    it("prevents hard deletion and disallows deleting the headquarters branch", async () => {
      const deleteHqRes = await deleteBranchAction(hqBranchId);
      expect(deleteHqRes.success).toBe(false);
      expect(deleteHqRes.error).toContain(
        "Cannot delete the organization headquarters branch"
      );

      // Headquarters remains active in database
      const hq = await prisma.branch.findUnique({ where: { id: hqBranchId } });
      expect(hq?.deletedAt).toBeNull();
    });

    it("soft deletes a secondary branch with deletedAt and preserves ledger history", async () => {
      const createRes = await createBranchAction({
        companyId,
        name: "Berlin Hub",
        code: "BER-01",
        timezone: "Europe/Berlin",
      });
      const branchId = createRes.branch!.id;

      const deleteRes = await deleteBranchAction(branchId);
      expect(deleteRes.success).toBe(true);

      // Record is preserved with deletedAt timestamp
      const softDeleted = await prisma.branch.findUnique({
        where: { id: branchId },
      });
      expect(softDeleted).not.toBeNull();
      expect(softDeleted?.deletedAt).not.toBeNull();

      // Audit log records DELETE action
      const deleteAudit = await prisma.auditLog.findFirst({
        where: {
          entity: "Branch",
          action: "DELETE",
          entityId: branchId,
        },
      });
      expect(deleteAudit).not.toBeNull();
    });
  });

  describe("Department Hierarchy & Tree Validation (AC-2, AC-3, AC-4, AC-7)", () => {
    it("creates hierarchical parent and child departments", async () => {
      // Create root department: Operations
      const rootRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "Operations",
        code: "OPS",
      });
      expect(rootRes.success).toBe(true);
      const rootId = rootRes.department!.id;

      // Create child department: Logistics under Operations
      const childRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "Logistics",
        code: "OPS-LOG",
        parentId: rootId,
      });
      expect(childRes.success).toBe(true);
      const childId = childRes.department!.id;

      // Verify parent child relation in database
      const childDb = await prisma.department.findUnique({
        where: { id: childId },
        include: { parent: true },
      });
      expect(childDb?.parentId).toBe(rootId);
      expect(childDb?.parent?.name).toBe("Operations");

      // Verify audit logs
      const auditLog = await prisma.auditLog.findFirst({
        where: { entity: "Department", action: "CREATE", entityId: childId },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.branchId).toBe(hqBranchId);
    });

    it("enforces unique department code within the branch", async () => {
      await createDepartmentAction({
        branchId: hqBranchId,
        name: "Human Resources",
        code: "HR",
      });

      const dupRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "HR Duplicate",
        code: "HR",
      });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already exists in this branch");
    });

    it("prevents circular department hierarchies where department is its own parent", async () => {
      const deptRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "Finance",
        code: "FIN",
      });
      const deptId = deptRes.department!.id;

      const updateRes = await updateDepartmentAction(deptId, {
        parentId: deptId,
      });
      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain("cannot be its own parent");
    });

    it("prevents deleting parent department with active sub-departments", async () => {
      const parentRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "Engineering",
        code: "ENG",
      });
      const parentId = parentRes.department!.id;

      await createDepartmentAction({
        branchId: hqBranchId,
        name: "Quality Assurance",
        code: "ENG-QA",
        parentId,
      });

      // Attempt to delete parent should fail
      const deleteParentRes = await deleteDepartmentAction(parentId);
      expect(deleteParentRes.success).toBe(false);
      expect(deleteParentRes.error).toContain(
        "Cannot delete department with active sub-departments"
      );

      // Parent remains active
      const parentDb = await prisma.department.findUnique({
        where: { id: parentId },
      });
      expect(parentDb?.deletedAt).toBeNull();
    });

    it("soft deletes department after children are removed", async () => {
      const deptRes = await createDepartmentAction({
        branchId: hqBranchId,
        name: "Marketing",
        code: "MKT",
      });
      const deptId = deptRes.department!.id;

      const deleteRes = await deleteDepartmentAction(deptId);
      expect(deleteRes.success).toBe(true);

      const dbDept = await prisma.department.findUnique({
        where: { id: deptId },
      });
      expect(dbDept).not.toBeNull();
      expect(dbDept?.deletedAt).not.toBeNull();
    });
  });

  describe("Branch Context Switching & Security Audit (AC-5)", () => {
    let secondaryBranchId: string;

    beforeEach(async () => {
      const branch2 = await prisma.branch.create({
        data: {
          companyId,
          name: "Singapore Branch",
          code: "SIN-01",
          timezone: "Asia/Singapore",
        },
      });
      secondaryBranchId = branch2.id;
    });

    it("allows authorized user to switch active branch and sets cookie", async () => {
      // Act as regular user assigned to HQ
      currentAuthUser = {
        id: regularUserId,
        email: "operator@acme.corp",
        name: "Branch Operator",
        roles: ["USER"],
        permissions: [],
        branches: [
          {
            id: hqBranchId,
            name: "Acme HQ New York",
            code: "NYC-HQ",
            isDefault: true,
          },
        ],
      };

      const res = await setActiveBranchAction(hqBranchId);
      expect(res.success).toBe(true);
      expect(res.branch?.id).toBe(hqBranchId);

      // Verify cookie was set
      expect(mockCookieJar["active_branch_id"]).toBeDefined();
      expect(mockCookieJar["active_branch_id"].value).toBe(hqBranchId);

      // Verify user's activeBranchId was updated in database
      const user = await prisma.user.findUnique({
        where: { id: regularUserId },
      });
      expect(user?.activeBranchId).toBe(hqBranchId);
    });

    it("rejects unauthorized branch switch and logs BRANCH_ACCESS_DENIED audit entry", async () => {
      // Act as regular user NOT assigned to Singapore Branch
      currentAuthUser = {
        id: regularUserId,
        email: "operator@acme.corp",
        name: "Branch Operator",
        roles: ["USER"],
        permissions: [],
        branches: [
          {
            id: hqBranchId,
            name: "Acme HQ New York",
            code: "NYC-HQ",
            isDefault: true,
          },
        ],
      };

      const res = await setActiveBranchAction(secondaryBranchId);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized branch access");

      // Verify security audit log recorded the denied access attempt
      const securityAudit = await prisma.auditLog.findFirst({
        where: {
          action: "BRANCH_ACCESS_DENIED",
          entity: "Branch",
          entityId: secondaryBranchId,
          userId: regularUserId,
        },
      });
      expect(securityAudit).not.toBeNull();
      expect(securityAudit?.branchId).toBe(secondaryBranchId);
    });

    it("allows super administrator to switch to any branch", async () => {
      // Act as Super Admin (not explicitly assigned to Singapore in branches array)
      currentAuthUser = {
        id: testUserId,
        email: "superadmin@acme.corp",
        name: "Super Administrator",
        roles: ["SUPER_ADMIN"],
        permissions: ["ORG_MANAGE"],
        branches: [],
      };

      const res = await setActiveBranchAction(secondaryBranchId);
      expect(res.success).toBe(true);
      expect(res.branch?.code).toBe("SIN-01");
    });
  });

  describe("Two-Factor Authentication Lifecycle & Recovery (AC-1, AC-8)", () => {
    it("generates TOTP secret, QR code and backup codes for enrollment", async () => {
      const setupRes = await setupTwoFactorAction();
      expect(setupRes.success).toBe(true);
      expect(setupRes.secret).toBeDefined();
      expect(setupRes.secret.length).toBeGreaterThan(10);
      expect(setupRes.qrCodeDataUrl).toContain("data:image/png;base64,");
      expect(setupRes.backupCodes).toHaveLength(8);
    });

    it("rejects invalid TOTP confirmation code and preserves unverified status", async () => {
      const setupRes = await setupTwoFactorAction();
      const confirmRes = await confirmTwoFactorAction({
        token: "000000",
        secret: setupRes.secret,
        backupCodes: setupRes.backupCodes,
      });

      expect(confirmRes.success).toBe(false);
      expect(confirmRes.error).toContain(
        "Invalid two factor verification code"
      );

      // User in database must not have 2FA enabled
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.twoFactorEnabled).toBe(false);
    });

    it("confirms 2FA enrollment with valid TOTP token and records audit log", async () => {
      const setupRes = await setupTwoFactorAction();
      const validToken = generateSync({ secret: setupRes.secret });

      const confirmRes = await confirmTwoFactorAction({
        token: validToken,
        secret: setupRes.secret,
        backupCodes: setupRes.backupCodes,
      });
      expect(confirmRes.success).toBe(true);

      // Verify user updated in database
      const dbUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(dbUser?.twoFactorEnabled).toBe(true);
      expect(dbUser?.twoFactorSecret).toBe(setupRes.secret);
      expect(dbUser?.twoFactorBackupCodes).toHaveLength(8);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "User",
          action: "2FA_ENABLE",
          entityId: testUserId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("allows super administrator to reset lost 2FA device with mandatory audit logging", async () => {
      // First enable 2FA on target user
      await prisma.user.update({
        where: { id: regularUserId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: "secret-to-clear",
          twoFactorBackupCodes: ["CODE1", "CODE2"],
        },
      });

      // Admin executes reset
      const resetRes = await resetUserTwoFactorAction(
        regularUserId,
        "Employee lost mobile authenticator device after hardware replacement"
      );
      expect(resetRes.success).toBe(true);

      // Verify target user's 2FA credentials cleared
      const resetUser = await prisma.user.findUnique({
        where: { id: regularUserId },
      });
      expect(resetUser?.twoFactorEnabled).toBe(false);
      expect(resetUser?.twoFactorSecret).toBeNull();
      expect(resetUser?.twoFactorBackupCodes).toHaveLength(0);

      // Verify audit log records 2FA_RESET with reason and admin ID
      const resetAudit = await prisma.auditLog.findFirst({
        where: {
          entity: "User",
          action: "2FA_RESET",
          entityId: regularUserId,
        },
      });
      expect(resetAudit).not.toBeNull();
      expect(resetAudit?.userId).toBe(testUserId);
      const after = resetAudit?.after as Record<string, unknown>;
      expect(after?.reason).toContain("lost mobile authenticator");
      expect(after?.resetByAdminId).toBe(testUserId);
    });

    it("prevents non-super-admin from resetting another user's 2FA", async () => {
      // Act as regular user without SUPER_ADMIN role
      currentAuthUser = {
        id: regularUserId,
        email: "operator@acme.corp",
        name: "Branch Operator",
        roles: ["USER"],
        permissions: [],
        branches: [],
      };

      await expect(
        resetUserTwoFactorAction(testUserId, "Unauthorized attempt")
      ).rejects.toThrow("FORBIDDEN: Only super administrators");
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });
});
