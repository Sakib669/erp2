import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import bcrypt from "bcryptjs";
import {
  checkRateLimit,
  clearRateLimitStore,
  getSecurityStatus,
} from "@/lib/rate-limiter";
import {
  triggerDatabaseBackupAction,
  getDatabaseBackupsAction,
  getSecurityOverviewAction,
} from "@/actions/backup-actions";

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "user-sec-1",
    roles: ["ADMIN"],
    permissions: ["ADMIN_WORKFLOWS"],
  }),
  requirePermission: vi.fn().mockResolvedValue(true),
  hasBranchPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "branch-sec-1" }),
  }),
}));

describe("Security Hardening and Automated Operations", () => {
  beforeEach(async () => {
    await cleanDatabase();
    clearRateLimitStore();

    await prisma.company.create({
      data: { id: "company-sec-1", name: "Security Co", code: "SECCO" },
    });
    await prisma.branch.create({
      data: {
        id: "branch-sec-1",
        companyId: "company-sec-1",
        name: "Secure Branch",
        code: "SB1",
      },
    });
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        id: "user-sec-1",
        email: "secadmin@example.com",
        name: "Security Admin",
        passwordHash: hashedPassword,
      },
    });
  });

  describe("Sliding window rate limiter", () => {
    it("should allow requests under the limit and block requests over the limit", () => {
      const key = "ip-test-127.0.0.1";
      const limit = 3;
      const windowSeconds = 10;

      const r1 = checkRateLimit(key, limit, windowSeconds);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(key, limit, windowSeconds);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(key, limit, windowSeconds);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // Exceeded limit
      const r4 = checkRateLimit(key, limit, windowSeconds);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });

    it("should verify security posture directives", () => {
      const posture = getSecurityStatus();
      expect(posture.rateLimitingEnabled).toBe(true);
      expect(posture.frameProtection).toBe("DENY (Clickjacking shield)");
      expect(posture.mimeSniffingProtection).toBe("nosniff");
    });
  });

  describe("Automated database backup routines", () => {
    it("should trigger manual backup and record SHA256 checksum", async () => {
      const res = await triggerDatabaseBackupAction();
      expect(res.success).toBe(true);
      expect(res.backup).toBeDefined();
      expect(res.backup?.checksum).toHaveLength(64); // SHA256 hex string length
      expect(res.backup?.status).toBe("COMPLETED");

      const backups = await getDatabaseBackupsAction();
      expect(backups).toHaveLength(1);
      expect(backups[0].fileName).toBe(res.backup?.fileName);
    });

    it("should fetch security overview with backup counters", async () => {
      await triggerDatabaseBackupAction();

      const overview = await getSecurityOverviewAction();
      expect(overview.success).toBe(true);
      expect(overview.data?.totalBackups).toBe(1);
      expect(overview.data?.latestBackup).toBeDefined();
      expect(overview.data?.posture.rateLimitingEnabled).toBe(true);
    });
  });
});
