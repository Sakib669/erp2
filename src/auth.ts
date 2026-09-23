import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTwoFactorToken } from "@/lib/totp";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, twoFactorCode } = parsed.data;

        const user = await prisma.user.findFirst({
          where: {
            email,
            deletedAt: null,
            status: "ACTIVE",
          },
          include: {
            userRoles: {
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
            },
            userBranches: {
              include: {
                branch: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!isValidPassword) {
          await prisma.$transaction(async (tx) => {
            await recordAudit(
              tx,
              { userId: user.id },
              {
                action: "LOGIN_FAILED",
                entity: "User",
                entityId: user.id,
                before: { reason: "Invalid credentials" },
              }
            );
          });
          return null;
        }

        if (user.twoFactorEnabled) {
          if (!twoFactorCode) {
            throw new Error("2FA_REQUIRED");
          }

          if (!user.twoFactorSecret) {
            return null;
          }

          const isValidToken = verifyTwoFactorToken(
            twoFactorCode,
            user.twoFactorSecret
          );
          const isBackupCode =
            user.twoFactorBackupCodes.includes(twoFactorCode);

          if (!isValidToken && !isBackupCode) {
            await prisma.$transaction(async (tx) => {
              await recordAudit(
                tx,
                { userId: user.id },
                {
                  action: "LOGIN_FAILED",
                  entity: "User",
                  entityId: user.id,
                  before: { reason: "Invalid 2FA code" },
                }
              );
            });
            throw new Error("INVALID_2FA_CODE");
          }
        }

        const defaultBranch =
          user.userBranches.find((ub) => ub.isDefault) ?? user.userBranches[0];
        const activeBranchId =
          user.activeBranchId ?? defaultBranch?.branchId ?? null;

        await prisma.$transaction(async (tx) => {
          await recordAudit(
            tx,
            { userId: user.id, branchId: activeBranchId },
            {
              action: "LOGIN_SUCCESS",
              entity: "User",
              entityId: user.id,
            }
          );
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          activeBranchId,
          roles: user.userRoles.map((ur) => ur.role.code),
          permissions: Array.from(
            new Set(
              user.userRoles.flatMap((ur) =>
                ur.role.permissions.map((rp) => rp.permission.code)
              )
            )
          ),
          branches: user.userBranches.map((ub) => ({
            id: ub.branch.id,
            name: ub.branch.name,
            code: ub.branch.code,
            isDefault: ub.isDefault,
          })),
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.activeBranchId = user.activeBranchId;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.branches = user.branches;
      }
      if (trigger === "update" && session?.activeBranchId) {
        token.activeBranchId = session.activeBranchId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.activeBranchId = token.activeBranchId as string | null;
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.branches =
          (token.branches as Array<{
            id: string;
            name: string;
            code: string;
            isDefault: boolean;
          }>) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});
