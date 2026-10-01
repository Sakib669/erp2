import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "./helpers/teardown";
import {
  createFixedAssetAction,
  getFixedAssetsAction,
  runDepreciationAction,
  disposeAssetAction,
} from "@/actions/asset-actions";
import { JournalLineType } from "@prisma/client";

// Mock auth
vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi
    .fn()
    .mockResolvedValue({ id: "user-1", companyId: "company-1" }),
  requirePermission: vi.fn().mockResolvedValue(true),
  getCurrentUser: vi
    .fn()
    .mockResolvedValue({ id: "user-1", companyId: "company-1" }),
  requireBranchAndUser: vi.fn().mockResolvedValue({
    user: { id: "user-1", companyId: "company-1" },
    branchId: "branch-1",
    companyId: "company-1",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "branch-1" }),
  }),
}));

describe("Fixed Asset Management", () => {
  beforeEach(async () => {
    await cleanDatabase();

    await prisma.company.create({
      data: { id: "company-1", name: "Test Company", code: "COMP-1" },
    });
    await prisma.branch.create({
      data: { id: "branch-1", companyId: "company-1", name: "HQ", code: "HQ" },
    });

    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        passwordHash: hashedPassword,
      },
    });

    // Create GL Accounts for testing
    await prisma.account.createMany({
      data: [
        {
          id: "acc-depr-exp",
          companyId: "company-1",
          code: "6000",
          name: "Depreciation Exp",
          type: "EXPENSE",
        },
        {
          id: "acc-acc-depr",
          companyId: "company-1",
          code: "1501",
          name: "Accumulated Depr",
          type: "ASSET",
        },
        {
          id: "acc-cash",
          companyId: "company-1",
          code: "1000",
          name: "Cash",
          type: "ASSET",
        },
        {
          id: "acc-asset",
          companyId: "company-1",
          code: "1500",
          name: "Fixed Asset",
          type: "ASSET",
        },
        {
          id: "acc-loss",
          companyId: "company-1",
          code: "7000",
          name: "Loss on Disposal",
          type: "EXPENSE",
        },
        {
          id: "acc-gain",
          companyId: "company-1",
          code: "8000",
          name: "Gain on Disposal",
          type: "REVENUE",
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  it("should create a fixed asset and retrieve it", async () => {
    const res = await createFixedAssetAction({
      branchId: "branch-1",
      assetCode: "MAC-01",
      name: "MacBook Pro",
      category: "IT Equipment",
      purchaseDate: new Date("2026-01-01"),
      purchaseCost: 200000, // $2000
      usefulLifeYears: 4,
      salvageValue: 20000, // $200
    });

    expect(res.success).toBe(true);
    expect(res.asset?.currentBookValue).toBe(200000);

    const listRes = await getFixedAssetsAction();
    expect(listRes.assets?.length).toBe(1);
    expect(listRes.assets?.[0].assetCode).toBe("MAC-01");
  });

  it("should run straight line depreciation", async () => {
    const assetRes = await createFixedAssetAction({
      branchId: "branch-1",
      assetCode: "MAC-02",
      name: "MacBook Pro 2",
      category: "IT Equipment",
      purchaseDate: new Date("2026-01-01"),
      purchaseCost: 140000,
      usefulLifeYears: 1, // $120,000 depreciable base per year -> $10,000 per month
      salvageValue: 20000,
    });

    const asset = assetRes.asset!;

    const deprRes = await runDepreciationAction({
      assetId: asset.id,
      periodEndDate: new Date("2026-01-31"),
      depreciationExpenseAccountId: "acc-depr-exp",
      accumulatedDepreciationAccountId: "acc-acc-depr",
    });

    expect(deprRes.success).toBe(true);
    expect(deprRes.depreciation?.depreciationAmount).toBe(10000);
    expect(deprRes.depreciation?.bookValueAfter).toBe(130000);

    // Check GL Entry
    const je = await prisma.journalEntry.findFirst({
      where: { reference: `ASSET_DEP_${asset.id}` },
      include: { lines: true },
    });

    expect(je).toBeDefined();
    expect(je?.totalAmount).toBe(10000);
    expect(je?.lines.length).toBe(2);
  });

  it("should dispose an asset for a loss", async () => {
    const assetRes = await createFixedAssetAction({
      branchId: "branch-1",
      assetCode: "CAR-01",
      name: "Company Car",
      category: "Vehicles",
      purchaseDate: new Date("2026-01-01"),
      purchaseCost: 3000000,
      usefulLifeYears: 5,
      salvageValue: 500000,
    });

    const asset = assetRes.asset!;

    // Depreciate 1 month -> $41,667
    await runDepreciationAction({
      assetId: asset.id,
      periodEndDate: new Date("2026-01-31"),
      depreciationExpenseAccountId: "acc-depr-exp",
      accumulatedDepreciationAccountId: "acc-acc-depr",
    });

    // Book value is now ~ 2958333
    const disposeRes = await disposeAssetAction({
      assetId: asset.id,
      disposalAmount: 2000000, // Sold for $20,000 -> Loss
      fixedAssetAccountId: "acc-asset",
      cashAccountId: "acc-cash",
      accumulatedDepreciationAccountId: "acc-acc-depr",
      lossOnDisposalAccountId: "acc-loss",
      gainOnDisposalAccountId: "acc-gain",
    });

    expect(disposeRes.success).toBe(true);
    expect(disposeRes.asset?.status).toBe("DISPOSED");

    // Verify journal
    const je = await prisma.journalEntry.findFirst({
      where: { reference: `ASSET_DISP_${asset.id}` },
      include: { lines: true },
    });

    expect(je).toBeDefined();

    const lossLine = je?.lines.find((l) => l.accountId === "acc-loss");
    expect(lossLine).toBeDefined();
    expect(lossLine?.type).toBe(JournalLineType.DEBIT);
  });
});
