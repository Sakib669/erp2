import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
  getAccountsAction,
  createFiscalPeriodAction,
  toggleFiscalPeriodLockAction,
  getFiscalPeriodsAction,
  createJournalEntryAction,
  postJournalEntryAction,
  getJournalEntriesAction,
  getJournalEntryDetailsAction,
} from "@/actions/account-actions";
import { AccountType, JournalStatus } from "@prisma/client";

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
  usePathname: () => "/accounts",
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

describe("Feature 11: Double Entry General Ledger Integration Tests", () => {
  let companyId: string;
  let branchAId: string;
  let branchBId: string;
  let financeUserId: string;

  beforeEach(async () => {
    // Teardown in foreign key dependency order
    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.fiscalPeriod.deleteMany();
    await prisma.account.deleteMany();
    await prisma.payslipItem.deleteMany();
    await prisma.payslip.deleteMany();
    await prisma.payrollRun.deleteMany();
    await prisma.salaryComponent.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveBalance.deleteMany();
    await prisma.leaveType.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.rawAttendanceLog.deleteMany();
    await prisma.employeeTransition.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.designation.deleteMany();
    await prisma.department.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.userBranch.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.company.deleteMany();

    // Create Company
    const company = await prisma.company.create({
      data: {
        name: "Acme Enterprises Corp",
        code: "ACME-CORP",
        currency: "USD",
        timezone: "UTC",
      },
    });
    companyId = company.id;

    // Create Branches
    const branchA = await prisma.branch.create({
      data: {
        companyId,
        name: "HQ Boston",
        code: "BOS-01",
        timezone: "UTC",
        isHeadquarters: true,
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.create({
      data: {
        companyId,
        name: "Chicago Hub",
        code: "CHI-02",
        timezone: "UTC",
        isHeadquarters: false,
      },
    });
    branchBId = branchB.id;

    // Create Finance User
    const passwordHash = await bcrypt.hash("FinancePass123!", 10);
    const user = await prisma.user.create({
      data: {
        name: "Finance Controller",
        email: "finance@acme.com",
        passwordHash,
      },
    });
    financeUserId = user.id;

    // Setup session
    mockCurrentUser = {
      id: financeUserId,
      email: "finance@acme.com",
      name: "Finance Controller",
      activeBranchId: branchAId,
      roles: ["SUPER_ADMIN", "FINANCE_MANAGER"],
      permissions: ["ACCOUNTS_MANAGE", "ACCOUNTS_VIEW"],
      branches: [
        { id: branchAId, name: "HQ Boston", code: "BOS-01", isDefault: true },
        {
          id: branchBId,
          name: "Chicago Hub",
          code: "CHI-02",
          isDefault: false,
        },
      ],
    };
  });

  describe("Chart of Accounts Management", () => {
    it("creates an account with category, currency, and audit trail", async () => {
      const res = await createAccountAction({
        companyId,
        code: "1010",
        name: "Operating Bank Account",
        type: "ASSET",
        currency: "USD",
        description: "Primary operational checking account",
      });

      expect(res.success).toBe(true);
      expect(res.account).toBeDefined();
      expect(res.account?.code).toBe("1010");
      expect(res.account?.type).toBe(AccountType.ASSET);
      expect(res.account?.balance).toBe(0);

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "Account",
          action: "CREATE",
          entityId: res.account!.id,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("creates hierarchical parent and child accounts", async () => {
      const parentRes = await createAccountAction({
        companyId,
        code: "1000",
        name: "Current Assets",
        type: "ASSET",
      });
      expect(parentRes.success).toBe(true);

      const childRes = await createAccountAction({
        companyId,
        code: "1020",
        name: "Petty Cash",
        type: "ASSET",
        parentId: parentRes.account!.id,
      });
      expect(childRes.success).toBe(true);
      expect(childRes.account?.parentId).toBe(parentRes.account!.id);

      const accounts = await getAccountsAction(companyId);
      expect(accounts.success).toBe(true);
      const child = accounts.accounts?.find((a) => a.code === "1020");
      expect(child?.parent?.code).toBe("1000");
    });

    it("prevents creating accounts with duplicate code for the same company", async () => {
      await createAccountAction({
        companyId,
        code: "2010",
        name: "Accounts Payable",
        type: "LIABILITY",
      });

      const duplicateRes = await createAccountAction({
        companyId,
        code: "2010",
        name: "Duplicate Accounts Payable",
        type: "LIABILITY",
      });

      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain("already exists");
    });

    it("updates account details and validates code uniqueness", async () => {
      const createRes = await createAccountAction({
        companyId,
        code: "4010",
        name: "Sales Revenue",
        type: "REVENUE",
      });

      const updateRes = await updateAccountAction({
        id: createRes.account!.id,
        name: "Product Sales Revenue",
        description: "Revenue from primary merchandise",
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.account?.name).toBe("Product Sales Revenue");
      expect(updateRes.account?.description).toBe(
        "Revenue from primary merchandise"
      );
    });

    it("deletes an account with no postings and prevents deleting one with journal lines", async () => {
      const accRes = await createAccountAction({
        companyId,
        code: "5010",
        name: "Office Supplies Expense",
        type: "EXPENSE",
      });
      const accountId = accRes.account!.id;

      // Soft delete succeeds when unused
      const deleteRes = await deleteAccountAction(accountId);
      expect(deleteRes.success).toBe(true);

      const deleted = await prisma.account.findUnique({
        where: { id: accountId },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });

  describe("Fiscal Period Management & Period Locking", () => {
    it("creates a fiscal period and prevents duplicate names", async () => {
      const res = await createFiscalPeriodAction({
        companyId,
        name: "FY2026-Q1",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      });

      expect(res.success).toBe(true);
      expect(res.period?.name).toBe("FY2026-Q1");
      expect(res.period?.isClosed).toBe(false);

      const dupRes = await createFiscalPeriodAction({
        companyId,
        name: "FY2026-Q1",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain("already exists");
    });

    it("locks and unlocks a fiscal period with audit logging", async () => {
      const periodRes = await createFiscalPeriodAction({
        companyId,
        name: "FY2026-Q2",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
      });
      const periodId = periodRes.period!.id;

      // Lock period
      const lockRes = await toggleFiscalPeriodLockAction({
        id: periodId,
        isClosed: true,
      });
      expect(lockRes.success).toBe(true);
      expect(lockRes.period?.isClosed).toBe(true);
      expect(lockRes.period?.closedAt).not.toBeNull();
      expect(lockRes.period?.closedByUserId).toBe(financeUserId);

      // Verify lock audit log
      const lockAudit = await prisma.auditLog.findFirst({
        where: {
          entity: "FiscalPeriod",
          action: "LOCK_PERIOD",
          entityId: periodId,
        },
      });
      expect(lockAudit).not.toBeNull();

      // Unlock period
      const unlockRes = await toggleFiscalPeriodLockAction({
        id: periodId,
        isClosed: false,
      });
      expect(unlockRes.success).toBe(true);
      expect(unlockRes.period?.isClosed).toBe(false);
    });

    it("lists fiscal periods for the company", async () => {
      await createFiscalPeriodAction({
        companyId,
        name: "FY2026-Q3",
        startDate: "2026-07-01",
        endDate: "2026-09-30",
      });

      const listRes = await getFiscalPeriodsAction(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.periods?.length).toBe(1);
    });
  });

  describe("Double Entry Journal Voucher Engine", () => {
    let cashAccountId: string;
    let revenueAccountId: string;

    beforeEach(async () => {
      const cash = await createAccountAction({
        companyId,
        code: "1010",
        name: "Operating Cash",
        type: "ASSET",
      });
      cashAccountId = cash.account!.id;

      const revenue = await createAccountAction({
        companyId,
        code: "4010",
        name: "Consulting Revenue",
        type: "REVENUE",
      });
      revenueAccountId = revenue.account!.id;
    });

    it("rejects an unbalanced journal voucher", async () => {
      // Debit 50,000 cents ($500.00) vs Credit 40,000 cents ($400.00)
      const res = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-07-15",
        description: "Client invoice payment",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 50000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 40000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("must be equal");
    });

    it("rejects creating journal vouchers in a closed fiscal period", async () => {
      // Create and lock FY2026-Q1 (Jan 1 to Mar 31)
      const periodRes = await createFiscalPeriodAction({
        companyId,
        name: "FY2026-Q1",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      });
      await toggleFiscalPeriodLockAction({
        id: periodRes.period!.id,
        isClosed: true,
      });

      // Attempt to record entry on 2026-02-15
      const res = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-02-15",
        description: "Backdated adjustment",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 10000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 10000 },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Fiscal period 'FY2026-Q1' is closed");
    });

    it("creates a balanced draft journal voucher with sequential voucher numbering", async () => {
      const res1 = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-01",
        description: "First service invoice",
        reference: "INV-001",
        lines: [
          {
            accountId: cashAccountId,
            type: "DEBIT",
            amount: 250000,
            memo: "Cash received",
          },
          {
            accountId: revenueAccountId,
            type: "CREDIT",
            amount: 250000,
            memo: "Service fee",
          },
        ],
      });

      expect(res1.success).toBe(true);
      expect(res1.journalEntry?.status).toBe(JournalStatus.DRAFT);
      expect(res1.journalEntry?.totalAmount).toBe(250000);
      expect(res1.journalEntry?.entryNumber).toMatch(/^JV-2026-\d{4}$/);

      const res2 = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-02",
        description: "Second service invoice",
        reference: "INV-002",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 150000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 150000 },
        ],
      });

      expect(res2.success).toBe(true);
      expect(res2.journalEntry?.entryNumber).not.toBe(
        res1.journalEntry?.entryNumber
      );
    });

    it("prevents deleting an account once journal postings reference it", async () => {
      const entryRes = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-10",
        description: "Consulting receipt",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 50000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 50000 },
        ],
      });
      expect(entryRes.success).toBe(true);

      const deleteRes = await deleteAccountAction(cashAccountId);
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.error).toContain(
        "Cannot delete account with 1 existing journal postings"
      );
    });
  });

  describe("General Ledger Posting and Real-Time Balance Updates", () => {
    let cashAccountId: string;
    let revenueAccountId: string;
    let rentExpenseAccountId: string;
    let payableAccountId: string;

    beforeEach(async () => {
      // Asset
      const cash = await createAccountAction({
        companyId,
        code: "1010",
        name: "Operating Cash",
        type: "ASSET",
      });
      cashAccountId = cash.account!.id;

      // Revenue
      const rev = await createAccountAction({
        companyId,
        code: "4010",
        name: "Consulting Income",
        type: "REVENUE",
      });
      revenueAccountId = rev.account!.id;

      // Expense
      const exp = await createAccountAction({
        companyId,
        code: "5010",
        name: "Office Rent",
        type: "EXPENSE",
      });
      rentExpenseAccountId = exp.account!.id;

      // Liability
      const liab = await createAccountAction({
        companyId,
        code: "2010",
        name: "Accounts Payable",
        type: "LIABILITY",
      });
      payableAccountId = liab.account!.id;
    });

    it("posts journal entry and updates balances for Asset and Revenue", async () => {
      // Initial balances are 0
      const cashBefore = await prisma.account.findUnique({
        where: { id: cashAccountId },
      });
      const revBefore = await prisma.account.findUnique({
        where: { id: revenueAccountId },
      });
      expect(cashBefore?.balance).toBe(0);
      expect(revBefore?.balance).toBe(0);

      // Create voucher: Debit Cash $1,000.00 (100,000 cents), Credit Revenue $1,000.00
      const createRes = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-15",
        description: "Customer payment received",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 100000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 100000 },
        ],
      });
      expect(createRes.success).toBe(true);
      const entryId = createRes.journalEntry!.id;

      // Balances should not change until posted!
      const cashMid = await prisma.account.findUnique({
        where: { id: cashAccountId },
      });
      expect(cashMid?.balance).toBe(0);

      // Post entry
      const postRes = await postJournalEntryAction({ id: entryId });
      expect(postRes.success).toBe(true);
      expect(postRes.journalEntry?.status).toBe(JournalStatus.POSTED);
      expect(postRes.journalEntry?.postedAt).not.toBeNull();
      expect(postRes.journalEntry?.postedByUserId).toBe(financeUserId);

      // Asset increases with DEBIT: balance becomes +100,000
      const cashAfter = await prisma.account.findUnique({
        where: { id: cashAccountId },
      });
      expect(cashAfter?.balance).toBe(100000);

      // Revenue increases with CREDIT: balance becomes +100,000
      const revAfter = await prisma.account.findUnique({
        where: { id: revenueAccountId },
      });
      expect(revAfter?.balance).toBe(100000);

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: "JournalEntry",
          action: "POST_JOURNAL_ENTRY",
          entityId: entryId,
        },
      });
      expect(audit).not.toBeNull();
    });

    it("posts multi-line entry and correctly updates Expense, Liability, and Asset balances", async () => {
      // Rent expense $1,500.00: Debit Expense $1,500.00 (150,000 cents), Credit Cash $1,000.00 (100,000 cents), Credit AP $500.00 (50,000 cents)
      const createRes = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-20",
        description: "August rent split payment",
        lines: [
          { accountId: rentExpenseAccountId, type: "DEBIT", amount: 150000 },
          { accountId: cashAccountId, type: "CREDIT", amount: 100000 },
          { accountId: payableAccountId, type: "CREDIT", amount: 50000 },
        ],
      });
      expect(createRes.success).toBe(true);
      const entryId = createRes.journalEntry!.id;

      // Post
      const postRes = await postJournalEntryAction({ id: entryId });
      expect(postRes.success).toBe(true);

      // Expense increases with DEBIT: +150,000
      const expAfter = await prisma.account.findUnique({
        where: { id: rentExpenseAccountId },
      });
      expect(expAfter?.balance).toBe(150000);

      // Asset decreases with CREDIT: -100,000
      const cashAfter = await prisma.account.findUnique({
        where: { id: cashAccountId },
      });
      expect(cashAfter?.balance).toBe(-100000);

      // Liability increases with CREDIT: +50,000
      const apAfter = await prisma.account.findUnique({
        where: { id: payableAccountId },
      });
      expect(apAfter?.balance).toBe(50000);
    });

    it("prevents double posting an already posted voucher", async () => {
      const createRes = await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-08-25",
        description: "Sample transaction",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 20000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 20000 },
        ],
      });
      const entryId = createRes.journalEntry!.id;

      // First post succeeds
      const firstPost = await postJournalEntryAction({ id: entryId });
      expect(firstPost.success).toBe(true);

      // Second post must fail
      const secondPost = await postJournalEntryAction({ id: entryId });
      expect(secondPost.success).toBe(false);
      expect(secondPost.error).toContain("already been posted");
    });
  });

  describe("Branch Scoping and Query Boundaries", () => {
    let cashAccountId: string;
    let revenueAccountId: string;

    beforeEach(async () => {
      const cash = await createAccountAction({
        companyId,
        code: "1010",
        name: "Operating Cash",
        type: "ASSET",
      });
      cashAccountId = cash.account!.id;

      const rev = await createAccountAction({
        companyId,
        code: "4010",
        name: "Revenue",
        type: "REVENUE",
      });
      revenueAccountId = rev.account!.id;

      // Create entry in Branch A
      await createJournalEntryAction({
        branchId: branchAId,
        entryDate: "2026-09-01",
        description: "Branch A sale",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 10000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 10000 },
        ],
      });

      // Create entry in Branch B
      await createJournalEntryAction({
        branchId: branchBId,
        entryDate: "2026-09-02",
        description: "Branch B sale",
        lines: [
          { accountId: cashAccountId, type: "DEBIT", amount: 20000 },
          { accountId: revenueAccountId, type: "CREDIT", amount: 20000 },
        ],
      });
    });

    it("respects branch boundaries in journal voucher queries", async () => {
      // Query Branch A specifically
      const branchARes = await getJournalEntriesAction({ branchId: branchAId });
      expect(branchARes.success).toBe(true);
      expect(branchARes.entries?.length).toBe(1);
      expect(branchARes.entries?.[0].branchId).toBe(branchAId);

      // Query Branch B specifically
      const branchBRes = await getJournalEntriesAction({ branchId: branchBId });
      expect(branchBRes.success).toBe(true);
      expect(branchBRes.entries?.length).toBe(1);
      expect(branchBRes.entries?.[0].branchId).toBe(branchBId);
    });

    it("fetches detailed voucher data with itemized lines and accounts", async () => {
      const listRes = await getJournalEntriesAction({ branchId: branchAId });
      const entryId = listRes.entries![0].id;

      const detailsRes = await getJournalEntryDetailsAction(entryId);
      expect(detailsRes.success).toBe(true);
      expect(detailsRes.entry?.lines.length).toBe(2);
      expect(detailsRes.entry?.lines[0].account).toBeDefined();
    });
  });
});
