import { prisma } from "@/lib/prisma";
import { recordAudit, AuditContext } from "@/lib/audit";

export class ConcurrencyConflictError extends Error {
  constructor(
    message = "Concurrency conflict: record was updated by another transaction"
  ) {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export async function updateSettingWithVersion(
  branchId: string | null,
  key: string,
  value: string,
  expectedVersion: number,
  context: AuditContext
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.setting.findFirst({
      where: {
        branchId,
        key,
      },
    });

    if (existing && existing.version !== expectedVersion) {
      throw new ConcurrencyConflictError(
        `Version conflict on setting "${key}". Expected version ${expectedVersion}, but found ${existing.version}.`
      );
    }

    if (existing) {
      const updated = await tx.setting.update({
        where: { id: existing.id },
        data: {
          value,
          version: existing.version + 1,
        },
      });

      await recordAudit(tx, context, {
        action: "UPDATE",
        entity: "Setting",
        entityId: existing.id,
        before: existing,
        after: updated,
      });

      return updated;
    }

    const created = await tx.setting.create({
      data: {
        branchId,
        key,
        value,
        version: 1,
      },
    });

    await recordAudit(tx, context, {
      action: "CREATE",
      entity: "Setting",
      entityId: created.id,
      after: created,
    });

    return created;
  });
}
