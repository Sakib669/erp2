"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createAccountSchema,
  updateAccountSchema,
  createFiscalPeriodSchema,
  toggleFiscalPeriodLockSchema,
  createJournalEntrySchema,
  postJournalEntrySchema,
  type CreateAccountInput,
  type UpdateAccountInput,
  type CreateFiscalPeriodInput,
  type ToggleFiscalPeriodLockInput,
  type CreateJournalEntryInput,
  type PostJournalEntryInput,
} from "@/lib/validations/account";
import { AccountType, JournalStatus, JournalLineType } from "@prisma/client";

// -------------------------------------------------------------
// Chart of Accounts Actions
// -------------------------------------------------------------

export async function createAccountAction(rawInput: CreateAccountInput) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = createAccountSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.account.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code.toUpperCase().trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Account code '${data.code}' already exists for this company`,
    };
  }

  const account = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "Account", entityId: "" },
    async (tx) => {
      return tx.account.create({
        data: {
          companyId: data.companyId,
          code: data.code.toUpperCase().trim(),
          name: data.name,
          type: data.type as AccountType,
          currency: data.currency,
          description: data.description || null,
          parentId: data.parentId || null,
        },
      });
    }
  );

  revalidatePath("/accounts");
  return { success: true, account };
}

export async function updateAccountAction(rawInput: UpdateAccountInput) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = updateAccountSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.account.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Account not found" };
  }

  if (data.code && data.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.account.findFirst({
      where: {
        companyId: existing.companyId,
        code: data.code.toUpperCase().trim(),
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Account code '${data.code}' is already used by another account`,
      };
    }
  }

  const account = await withAuditTransaction(
    { userId: user.id },
    { action: "UPDATE", entity: "Account", entityId: id, before: existing },
    async (tx) => {
      return tx.account.update({
        where: { id },
        data: {
          code: data.code ? data.code.toUpperCase().trim() : existing.code,
          name: data.name ?? existing.name,
          type: (data.type as AccountType) ?? existing.type,
          description:
            data.description !== undefined
              ? data.description
              : existing.description,
          parentId:
            data.parentId !== undefined ? data.parentId : existing.parentId,
        },
      });
    }
  );

  revalidatePath("/accounts");
  return { success: true, account };
}

export async function deleteAccountAction(accountId: string) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const existing = await prisma.account.findFirst({
    where: { id: accountId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Account not found" };
  }

  const linesCount = await prisma.journalLine.count({
    where: { accountId },
  });

  if (linesCount > 0) {
    return {
      success: false,
      error: `Cannot delete account with ${linesCount} existing journal postings`,
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    {
      action: "DELETE",
      entity: "Account",
      entityId: accountId,
      before: existing,
    },
    async (tx) => {
      return tx.account.update({
        where: { id: accountId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/accounts");
  return { success: true };
}

export async function getAccountsAction(companyId?: string) {
  await requireAuth();
  await requirePermission("ACCOUNTS_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, accounts: [] };
  }

  const accounts = await prisma.account.findMany({
    where: { companyId: targetCompanyId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true, code: true } },
      _count: { select: { journalLines: true } },
    },
    orderBy: [{ code: "asc" }],
  });

  return { success: true, accounts };
}

// -------------------------------------------------------------
// Fiscal Period Actions
// -------------------------------------------------------------

export async function createFiscalPeriodAction(
  rawInput: CreateFiscalPeriodInput
) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = createFiscalPeriodSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.fiscalPeriod.findFirst({
    where: {
      companyId: data.companyId,
      name: data.name.trim(),
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Fiscal period '${data.name}' already exists for this company`,
    };
  }

  const period = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "FiscalPeriod", entityId: "" },
    async (tx) => {
      return tx.fiscalPeriod.create({
        data: {
          companyId: data.companyId,
          name: data.name.trim(),
          startDate: new Date(`${data.startDate}T00:00:00.000Z`),
          endDate: new Date(`${data.endDate}T23:59:59.999Z`),
          isClosed: false,
        },
      });
    }
  );

  revalidatePath("/accounts/periods");
  return { success: true, period };
}

export async function toggleFiscalPeriodLockAction(
  rawInput: ToggleFiscalPeriodLockInput
) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = toggleFiscalPeriodLockSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, isClosed } = parsed.data;

  const existing = await prisma.fiscalPeriod.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Fiscal period not found" };
  }

  const period = await withAuditTransaction(
    { userId: user.id },
    {
      action: isClosed ? "LOCK_PERIOD" : "UNLOCK_PERIOD",
      entity: "FiscalPeriod",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      return tx.fiscalPeriod.update({
        where: { id },
        data: {
          isClosed,
          closedAt: isClosed ? new Date() : null,
          closedByUserId: isClosed ? user.id : null,
        },
      });
    }
  );

  revalidatePath("/accounts/periods");
  return { success: true, period };
}

export async function getFiscalPeriodsAction(companyId?: string) {
  await requireAuth();
  await requirePermission("ACCOUNTS_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, periods: [] };
  }

  const periods = await prisma.fiscalPeriod.findMany({
    where: { companyId: targetCompanyId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });

  return { success: true, periods };
}

// -------------------------------------------------------------
// Journal Voucher & Posting Engine
// -------------------------------------------------------------

export async function createJournalEntryAction(
  rawInput: CreateJournalEntryInput
) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = createJournalEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { branchId, entryDate, description, reference, lines } = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });

  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  const entryDateTime = new Date(`${entryDate}T00:00:00.000Z`);

  // Check if date falls in a closed fiscal period
  const closedPeriod = await prisma.fiscalPeriod.findFirst({
    where: {
      companyId: branch.companyId,
      isClosed: true,
      startDate: { lte: entryDateTime },
      endDate: { gte: entryDateTime },
      deletedAt: null,
    },
  });

  if (closedPeriod) {
    return {
      success: false,
      error: `Cannot record journal entry: Fiscal period '${closedPeriod.name}' is closed`,
    };
  }

  // Generate entry number
  const year = entryDateTime.getUTCFullYear();
  const count = await prisma.journalEntry.count({
    where: {
      companyId: branch.companyId,
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    },
  });

  const entryNumber = `JV-${year}-${String(count + 1).padStart(4, "0")}`;

  // Calculate total amount (sum of debits)
  const totalAmount = lines
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + l.amount, 0);

  const journalEntry = await withAuditTransaction(
    { userId: user.id, branchId },
    { action: "CREATE_JOURNAL_ENTRY", entity: "JournalEntry", entityId: "" },
    async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          companyId: branch.companyId,
          branchId,
          entryNumber,
          entryDate: entryDateTime,
          status: JournalStatus.DRAFT,
          description,
          reference: reference || null,
          totalAmount,
        },
      });

      for (const line of lines) {
        await tx.journalLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: line.accountId,
            type: line.type as JournalLineType,
            amount: line.amount,
            memo: line.memo || null,
          },
        });
      }

      return entry;
    }
  );

  revalidatePath("/accounts/journals");
  revalidatePath("/accounts");
  return { success: true, journalEntry };
}

export async function postJournalEntryAction(rawInput: PostJournalEntryInput) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_MANAGE");

  const parsed = postJournalEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id } = parsed.data;

  const existing = await prisma.journalEntry.findFirst({
    where: { id, deletedAt: null },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  if (!existing) {
    return { success: false, error: "Journal entry not found" };
  }

  if (existing.status === JournalStatus.POSTED) {
    return {
      success: false,
      error: "Journal entry has already been posted to the general ledger",
    };
  }

  if (existing.status === JournalStatus.CANCELLED) {
    return {
      success: false,
      error: "Cannot post a cancelled journal entry",
    };
  }

  // Check closed fiscal period
  const closedPeriod = await prisma.fiscalPeriod.findFirst({
    where: {
      companyId: existing.companyId,
      isClosed: true,
      startDate: { lte: existing.entryDate },
      endDate: { gte: existing.entryDate },
      deletedAt: null,
    },
  });

  if (closedPeriod) {
    return {
      success: false,
      error: `Cannot post entry: Fiscal period '${closedPeriod.name}' is closed`,
    };
  }

  // Balance verification
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of existing.lines) {
    if (line.type === JournalLineType.DEBIT) {
      totalDebits += line.amount;
    } else {
      totalCredits += line.amount;
    }
  }

  if (totalDebits !== totalCredits) {
    return {
      success: false,
      error: `Unbalanced journal voucher cannot be posted. Debits: ${totalDebits}, Credits: ${totalCredits}`,
    };
  }

  const postedEntry = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "POST_JOURNAL_ENTRY",
      entity: "JournalEntry",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      // Adjust balances for each affected account
      for (const line of existing.lines) {
        const account = line.account;
        let delta = 0;

        // Assets & Expenses: DEBIT increases (+), CREDIT decreases (-)
        // Liabilities, Equity, & Revenue: CREDIT increases (+), DEBIT decreases (-)
        if (
          account.type === AccountType.ASSET ||
          account.type === AccountType.EXPENSE
        ) {
          delta =
            line.type === JournalLineType.DEBIT ? line.amount : -line.amount;
        } else {
          delta =
            line.type === JournalLineType.CREDIT ? line.amount : -line.amount;
        }

        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: delta },
          },
        });
      }

      return tx.journalEntry.update({
        where: { id },
        data: {
          status: JournalStatus.POSTED,
          postedAt: new Date(),
          postedByUserId: user.id,
        },
      });
    }
  );

  revalidatePath("/accounts/journals");
  revalidatePath("/accounts");
  return { success: true, journalEntry: postedEntry };
}

export async function getJournalEntriesAction(filters?: {
  branchId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const user = await requireAuth();
  await requirePermission("ACCOUNTS_VIEW");

  const whereClause: Record<string, unknown> = { deletedAt: null };

  if (filters?.branchId && filters.branchId !== "ALL") {
    whereClause.branchId = filters.branchId;
  } else if (!user.roles.includes("SUPER_ADMIN") && user.activeBranchId) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.status && filters.status !== "ALL") {
    whereClause.status = filters.status as JournalStatus;
  }

  if (filters?.fromDate || filters?.toDate) {
    whereClause.entryDate = {
      ...(filters.fromDate
        ? { gte: new Date(`${filters.fromDate}T00:00:00.000Z`) }
        : {}),
      ...(filters.toDate
        ? { lte: new Date(`${filters.toDate}T23:59:59.999Z`) }
        : {}),
    };
  }

  const entries = await prisma.journalEntry.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { entryDate: "desc" },
  });

  return { success: true, entries };
}

export async function getJournalEntryDetailsAction(entryId: string) {
  await requireAuth();
  await requirePermission("ACCOUNTS_VIEW");

  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId, deletedAt: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          account: {
            select: { id: true, name: true, code: true, type: true },
          },
        },
        orderBy: [{ type: "asc" }, { amount: "desc" }],
      },
    },
  });

  if (!entry) {
    return { success: false, error: "Journal entry not found" };
  }

  return { success: true, entry };
}
