import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AuditContext {
  userId?: string | null;
  branchId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogParams {
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function recordAudit(
  tx: Prisma.TransactionClient,
  context: AuditContext,
  params: AuditLogParams
) {
  return tx.auditLog.create({
    data: {
      userId: context.userId ?? null,
      branchId: context.branchId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before
        ? (JSON.parse(JSON.stringify(params.before)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      after: params.after
        ? (JSON.parse(JSON.stringify(params.after)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });
}

export async function withAuditTransaction<T>(
  context: AuditContext,
  auditParams: AuditLogParams,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await operation(tx);

    const afterPayload =
      auditParams.after !== undefined ? auditParams.after : result;

    await recordAudit(tx, context, {
      ...auditParams,
      after: afterPayload,
    });

    return result;
  });
}
