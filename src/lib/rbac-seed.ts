import { PrismaClient } from "@prisma/client";

export interface PermissionSeedDef {
  name: string;
  code: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionSeedDef[] = [
  // Auth Module
  {
    name: "Sign In",
    code: "AUTH_LOGIN",
    module: "AUTH",
    description: "Standard authentication and application sign in",
  },
  {
    name: "Manage Personal Two Factor",
    code: "AUTH_2FA_MANAGE",
    module: "AUTH",
    description:
      "Pair and manage personal authenticator devices and backup codes",
  },
  {
    name: "Reset User Two Factor",
    code: "AUTH_2FA_RESET",
    module: "AUTH",
    description: "Administrative reset of lost staff two factor devices",
  },

  // Organization Module
  {
    name: "View Organization",
    code: "ORG_VIEW",
    module: "ORG",
    description: "View companies, physical branches, and department trees",
  },
  {
    name: "Manage Organization",
    code: "ORG_MANAGE",
    module: "ORG",
    description:
      "Create and update branches, headquarters settings, and departments",
  },
  {
    name: "Delete Organization Entities",
    code: "ORG_DELETE",
    module: "ORG",
    description: "Soft delete branches and department records",
  },

  // Role and RBAC Module
  {
    name: "View Roles",
    code: "ROLE_VIEW",
    module: "ROLE",
    description: "View system and custom roles with their permission matrices",
  },
  {
    name: "Manage Custom Roles",
    code: "ROLE_MANAGE",
    module: "ROLE",
    description: "Create and update custom roles and permission assignments",
  },
  {
    name: "Delete Custom Roles",
    code: "ROLE_DELETE",
    module: "ROLE",
    description: "Soft delete custom roles not marked as system roles",
  },

  // User Management Module
  {
    name: "View Users",
    code: "USER_VIEW",
    module: "USER",
    description: "View staff directory, employee profiles, and statuses",
  },
  {
    name: "Manage Users",
    code: "USER_MANAGE",
    module: "USER",
    description:
      "Create users, suspend accounts, and update branch memberships",
  },
  {
    name: "Assign User Roles",
    code: "USER_ASSIGN_ROLE",
    module: "USER",
    description: "Grant and revoke global or branch scoped roles to staff",
  },

  // HR Module
  {
    name: "View HR Records",
    code: "HR_VIEW",
    module: "HR",
    description:
      "View staff designations, employment details, and shift schedules",
  },
  {
    name: "Manage HR Records",
    code: "HR_MANAGE",
    module: "HR",
    description: "Update designations, transitions, transfers, and shifts",
  },

  // Payroll Module
  {
    name: "View Payroll",
    code: "PAYROLL_VIEW",
    module: "PAYROLL",
    description:
      "View salary structures, allowances, deductions, and pay slips",
  },
  {
    name: "Manage Payroll",
    code: "PAYROLL_MANAGE",
    module: "PAYROLL",
    description: "Process monthly payroll calculations and adjustments",
  },

  // Accounts Module
  {
    name: "View Financial Accounts",
    code: "ACCOUNTS_VIEW",
    module: "ACCOUNTS",
    description: "View general ledger, journal entries, and balance sheets",
  },
  {
    name: "Manage Financial Accounts",
    code: "ACCOUNTS_MANAGE",
    module: "ACCOUNTS",
    description: "Create accounts, post journal entries, and reconcile books",
  },

  // Inventory Module
  {
    name: "View Inventory",
    code: "INVENTORY_VIEW",
    module: "INVENTORY",
    description:
      "View warehouse stock levels, item variants, and transfer logs",
  },
  {
    name: "Manage Inventory",
    code: "INVENTORY_MANAGE",
    module: "INVENTORY",
    description:
      "Post goods receipts, stock adjustments, and warehouse transfers",
  },

  // Audit Module
  {
    name: "View Audit Logs",
    code: "AUDIT_VIEW",
    module: "AUDIT",
    description:
      "Review security logs, mutation diffs, and access denial records",
  },
];

export interface SystemRoleDef {
  name: string;
  code: string;
  description: string;
  permissionCodes: string[];
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    name: "Super Administrator",
    code: "SUPER_ADMIN",
    description:
      "Full unrestricted access across all organizational branches and system modules",
    permissionCodes: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    name: "Branch Manager",
    code: "BRANCH_MANAGER",
    description:
      "Operational leadership for assigned physical branch including staff, inventory, and departmental oversight",
    permissionCodes: [
      "AUTH_LOGIN",
      "AUTH_2FA_MANAGE",
      "ORG_VIEW",
      "USER_VIEW",
      "HR_VIEW",
      "HR_MANAGE",
      "INVENTORY_VIEW",
      "INVENTORY_MANAGE",
      "ACCOUNTS_VIEW",
    ],
  },
  {
    name: "Human Resources Manager",
    code: "HR_MANAGER",
    description:
      "Human capital management, employee lifecycle, designations, and payroll operations",
    permissionCodes: [
      "AUTH_LOGIN",
      "AUTH_2FA_MANAGE",
      "ORG_VIEW",
      "USER_VIEW",
      "HR_VIEW",
      "HR_MANAGE",
      "PAYROLL_VIEW",
      "PAYROLL_MANAGE",
    ],
  },
  {
    name: "Finance Manager",
    code: "FINANCE_MANAGER",
    description:
      "Double entry accounting, financial reports, payroll reconciliation, and audit oversight",
    permissionCodes: [
      "AUTH_LOGIN",
      "AUTH_2FA_MANAGE",
      "ORG_VIEW",
      "ACCOUNTS_VIEW",
      "ACCOUNTS_MANAGE",
      "PAYROLL_VIEW",
      "AUDIT_VIEW",
    ],
  },
  {
    name: "Standard Employee",
    code: "EMPLOYEE",
    description:
      "Standard operational role for staff self service and basic task execution",
    permissionCodes: ["AUTH_LOGIN", "AUTH_2FA_MANAGE", "ORG_VIEW"],
  },
];

export async function seedRbac(prisma: PrismaClient) {
  // 1. Upsert all system permissions
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
      create: {
        name: perm.name,
        code: perm.code,
        module: perm.module,
        description: perm.description,
      },
    });
  }

  // 2. Fetch all permissions map for fast id lookup
  const allDbPerms = await prisma.permission.findMany();
  const permMap = new Map(allDbPerms.map((p) => [p.code, p.id]));

  // 3. Upsert system roles and their role permissions
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
      create: {
        name: roleDef.name,
        code: roleDef.code,
        description: roleDef.description,
        isSystem: true,
      },
    });

    // Attach role permissions
    for (const permCode of roleDef.permissionCodes) {
      const permId = permMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  return {
    permissionsCount: SYSTEM_PERMISSIONS.length,
    rolesCount: SYSTEM_ROLES.length,
  };
}
