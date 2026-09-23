import { prisma } from "@/lib/prisma";

// Models that enforce branch level data isolation
const BRANCH_SCOPED_MODELS = new Set([
  "Department",
  "UserBranch",
  "UserRole",
  "AuditLog",
  "Setting",
  "Employee",
  "Shift",
  "Attendance",
  "LeaveBalance",
  "LeaveRequest",
  "Holiday",
  "SalaryTemplate",
  "PayrollPeriod",
  "Payslip",
  "Voucher",
  "Ledger",
  "Warehouse",
  "StockLedger",
  "PurchaseOrder",
  "GRN",
  "Asset",
]);

// Models that support soft deletes via deletedAt timestamp
const SOFT_DELETE_MODELS = new Set([
  "Company",
  "Branch",
  "Department",
  "User",
  "Role",
  "Employee",
  "SalaryTemplate",
  "Product",
  "Warehouse",
  "Supplier",
  "Asset",
]);

export function createBranchPrisma(branchId: string) {
  return prisma.$extends({
    name: "branch-isolation-and-soft-delete",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const newArgs = { ...args };
          newArgs.where = { ...newArgs.where };

          if (
            SOFT_DELETE_MODELS.has(model) &&
            (newArgs.where as { deletedAt?: unknown })?.deletedAt === undefined
          ) {
            (newArgs.where as Record<string, unknown>).deletedAt = null;
          }

          if (BRANCH_SCOPED_MODELS.has(model)) {
            (newArgs.where as Record<string, unknown>).branchId = branchId;
          }

          return query(newArgs);
        },

        async findFirst({ model, args, query }) {
          const newArgs = { ...args };
          newArgs.where = { ...newArgs.where };

          if (
            SOFT_DELETE_MODELS.has(model) &&
            (newArgs.where as { deletedAt?: unknown })?.deletedAt === undefined
          ) {
            (newArgs.where as Record<string, unknown>).deletedAt = null;
          }

          if (BRANCH_SCOPED_MODELS.has(model)) {
            (newArgs.where as Record<string, unknown>).branchId = branchId;
          }

          return query(newArgs);
        },

        async count({ model, args, query }) {
          const newArgs = { ...args };
          newArgs.where = { ...newArgs.where };

          if (
            SOFT_DELETE_MODELS.has(model) &&
            (newArgs.where as { deletedAt?: unknown })?.deletedAt === undefined
          ) {
            (newArgs.where as Record<string, unknown>).deletedAt = null;
          }

          if (BRANCH_SCOPED_MODELS.has(model)) {
            (newArgs.where as Record<string, unknown>).branchId = branchId;
          }

          return query(newArgs);
        },

        async create({ model, args, query }) {
          const newArgs = { ...args };
          if (
            BRANCH_SCOPED_MODELS.has(model) &&
            typeof newArgs.data === "object" &&
            newArgs.data !== null
          ) {
            (newArgs.data as Record<string, unknown>).branchId = branchId;
          }
          return query(newArgs);
        },

        async update({ model, args, query }) {
          const newArgs = { ...args };
          newArgs.where = { ...newArgs.where };

          if (BRANCH_SCOPED_MODELS.has(model)) {
            (newArgs.where as Record<string, unknown>).branchId = branchId;
          }

          if (
            SOFT_DELETE_MODELS.has(model) &&
            (newArgs.where as { deletedAt?: unknown })?.deletedAt === undefined
          ) {
            (newArgs.where as Record<string, unknown>).deletedAt = null;
          }

          return query(newArgs);
        },

        async updateMany({ model, args, query }) {
          const newArgs = { ...args };
          newArgs.where = { ...newArgs.where };

          if (BRANCH_SCOPED_MODELS.has(model)) {
            (newArgs.where as Record<string, unknown>).branchId = branchId;
          }

          if (
            SOFT_DELETE_MODELS.has(model) &&
            (newArgs.where as { deletedAt?: unknown })?.deletedAt === undefined
          ) {
            (newArgs.where as Record<string, unknown>).deletedAt = null;
          }

          return query(newArgs);
        },

        async delete({ model, args }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            // Transform hard delete into soft delete by setting deletedAt timestamp
            const delegate = (
              prisma as unknown as Record<
                string,
                { update: (params: unknown) => Promise<unknown> }
              >
            )[model.charAt(0).toLowerCase() + model.slice(1)];

            const whereClause = {
              ...args.where,
              ...(BRANCH_SCOPED_MODELS.has(model) ? { branchId } : {}),
            };

            return delegate.update({
              where: whereClause,
              data: { deletedAt: new Date() },
            });
          }

          // If not a soft-deleted model, execute delete with branch verification
          const newArgs = { ...args };
          if (BRANCH_SCOPED_MODELS.has(model)) {
            newArgs.where = { ...newArgs.where, branchId };
          }
          const delegate = (
            prisma as unknown as Record<
              string,
              { delete: (params: unknown) => Promise<unknown> }
            >
          )[model.charAt(0).toLowerCase() + model.slice(1)];
          return delegate.delete(newArgs);
        },

        async deleteMany({ model, args }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const delegate = (
              prisma as unknown as Record<
                string,
                { updateMany: (params: unknown) => Promise<unknown> }
              >
            )[model.charAt(0).toLowerCase() + model.slice(1)];

            const whereClause = {
              ...args.where,
              ...(BRANCH_SCOPED_MODELS.has(model) ? { branchId } : {}),
            };

            return delegate.updateMany({
              where: whereClause,
              data: { deletedAt: new Date() },
            });
          }

          const newArgs = { ...args };
          if (BRANCH_SCOPED_MODELS.has(model)) {
            newArgs.where = { ...newArgs.where, branchId };
          }
          const delegate = (
            prisma as unknown as Record<
              string,
              { deleteMany: (params: unknown) => Promise<unknown> }
            >
          )[model.charAt(0).toLowerCase() + model.slice(1)];
          return delegate.deleteMany(newArgs);
        },
      },
    },
  });
}

export type BranchPrismaClient = ReturnType<typeof createBranchPrisma>;

export function getBranchPrisma(branchId: string): BranchPrismaClient {
  return createBranchPrisma(branchId);
}
