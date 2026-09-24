"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  generateTwoFactorSecret,
  generateQrCodeDataUrl,
  verifyTwoFactorToken,
  generateBackupCodes,
} from "@/lib/totp";

export async function setupTwoFactorAction() {
  const user = await requireAuth();

  const email = user.email || "user@enterprise.local";
  const { secret, otpauth } = generateTwoFactorSecret(email, "ERP2 Enterprise");
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpauth);
  const backupCodes = generateBackupCodes(8);

  return {
    success: true,
    secret,
    qrCodeDataUrl,
    backupCodes,
  };
}

export async function confirmTwoFactorAction(input: {
  token: string;
  secret: string;
  backupCodes: string[];
}) {
  const user = await requireAuth();

  const isValid = verifyTwoFactorToken(input.token, input.secret);
  if (!isValid) {
    return {
      success: false,
      error:
        "Invalid two factor verification code. Please check your authenticator app.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: input.secret,
        twoFactorBackupCodes: input.backupCodes,
      },
    });

    await recordAudit(
      tx,
      { userId: user.id },
      {
        action: "2FA_ENABLE",
        entity: "User",
        entityId: user.id,
        after: { twoFactorEnabled: true },
      }
    );
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function disableTwoFactorAction(password: string) {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    return { success: false, error: "User not found" };
  }

  const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!isPasswordValid) {
    return {
      success: false,
      error:
        "Incorrect password. Two factor authentication cannot be disabled.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await recordAudit(
      tx,
      { userId: user.id },
      {
        action: "2FA_DISABLE",
        entity: "User",
        entityId: user.id,
        before: { twoFactorEnabled: true },
        after: { twoFactorEnabled: false },
      }
    );
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function resetUserTwoFactorAction(
  targetUserId: string,
  reason: string
) {
  const admin = await requireAuth();

  const isSuperAdmin = admin.roles.includes("SUPER_ADMIN");
  if (!isSuperAdmin) {
    throw new Error(
      "FORBIDDEN: Only super administrators can execute 2FA resets"
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, error: "Target user not found" };
  }

  if (!targetUser.twoFactorEnabled) {
    return {
      success: false,
      error: "Target user does not have two factor authentication enabled",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await recordAudit(
      tx,
      { userId: admin.id, branchId: targetUser.activeBranchId || undefined },
      {
        action: "2FA_RESET",
        entity: "User",
        entityId: targetUserId,
        before: {
          twoFactorEnabled: true,
          targetUserEmail: targetUser.email,
        },
        after: {
          twoFactorEnabled: false,
          resetByAdminId: admin.id,
          reason,
        },
      }
    );
  });

  revalidatePath("/admin/users");
  return { success: true };
}
