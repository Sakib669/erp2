"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import {
  createFixedAssetSchema,
  runDepreciationSchema,
  disposeAssetSchema,
} from "@/lib/validations/assets";
import { JournalStatus, JournalLineType } from "@prisma/client";
import { z } from "zod";

export async function createFixedAssetAction(
  rawInput: z.input<typeof createFixedAssetSchema>
) {
  await requireAuth();
  await requirePermission("ASSET_MANAGE");

  const parsed = createFixedAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const branch = await prisma.branch.findUnique({
    where: { id: data.branchId },
    select: { companyId: true },
  });
  if (!branch) throw new Error("Branch not found");
  const companyId = branch.companyId;

  const existing = await prisma.fixedAsset.findFirst({
    where: { companyId, assetCode: data.assetCode },
  });
  if (existing) {
    return {
      success: false,
      error: "Asset code already exists in this company.",
    };
  }

  const asset = await prisma.fixedAsset.create({
    data: {
      companyId,
      branchId: data.branchId,
      assetCode: data.assetCode,
      name: data.name,
      description: data.description,
      category: data.category,
      purchaseDate: data.purchaseDate,
      purchaseCost: data.purchaseCost,
      currentBookValue: data.purchaseCost,
      usefulLifeYears: data.usefulLifeYears,
      salvageValue: data.salvageValue,
    },
  });

  revalidatePath("/assets");
  return { success: true, asset };
}

export async function getFixedAssetsAction(search?: string, page = 1) {
  await requireAuth();
  await requirePermission("ASSET_VIEW");
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  if (!branch) throw new Error("Branch not found");
  const companyId = branch.companyId;

  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const whereClause: Record<string, unknown> = {
    companyId,
    branchId,
    deletedAt: null,
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { assetCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.fixedAsset.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.fixedAsset.count({ where: whereClause }),
  ]);

  return { success: true, assets, total, pages: Math.ceil(total / pageSize) };
}

export async function getFixedAssetDetailsAction(assetId: string) {
  await requireAuth();
  await requirePermission("ASSET_VIEW");
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  if (!branch) throw new Error("Branch not found");
  const companyId = branch.companyId;

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: assetId, companyId, branchId, deletedAt: null },
    include: {
      depreciations: {
        orderBy: { periodEndDate: "desc" },
        include: { journalEntry: true },
      },
    },
  });

  if (!asset) return { success: false, error: "Asset not found" };

  return { success: true, asset };
}

export async function runDepreciationAction(
  rawInput: z.input<typeof runDepreciationSchema>
) {
  const user = await requireAuth();
  await requirePermission("ASSET_MANAGE");
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  if (!branch) throw new Error("Branch not found");
  const companyId = branch.companyId;

  const parsed = runDepreciationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({
        where: {
          id: data.assetId,
          companyId,
          branchId,
          deletedAt: null,
          status: "ACTIVE",
        },
      });
      if (!asset) throw new Error("Asset not found or not active");

      // Check if already depreciated for this period (simplified: just checking if there's any depreciation in this month/year)
      const startOfMonth = new Date(
        data.periodEndDate.getFullYear(),
        data.periodEndDate.getMonth(),
        1
      );
      const existingRun = await tx.assetDepreciation.findFirst({
        where: {
          assetId: asset.id,
          periodEndDate: { gte: startOfMonth },
        },
      });
      if (existingRun)
        throw new Error("Asset already depreciated for this period");

      // Calculate straight-line depreciation for one month
      const depreciableBase = asset.purchaseCost - asset.salvageValue;
      const annualDepreciation = depreciableBase / asset.usefulLifeYears;
      let monthlyDepreciation = Math.round(annualDepreciation / 12);

      // Don't depreciate below salvage value
      if (asset.currentBookValue - monthlyDepreciation < asset.salvageValue) {
        monthlyDepreciation = asset.currentBookValue - asset.salvageValue;
      }

      if (monthlyDepreciation <= 0) {
        throw new Error("Asset is fully depreciated");
      }

      const newBookValue = asset.currentBookValue - monthlyDepreciation;

      // Create journal entry
      const je = await tx.journalEntry.create({
        data: {
          companyId,
          branchId,
          entryNumber: `DEP-${asset.assetCode}-${data.periodEndDate.getTime()}`,
          entryDate: data.periodEndDate,
          status: JournalStatus.POSTED,
          description: `Depreciation for ${asset.name} - ${data.periodEndDate.toISOString().split("T")[0]}`,
          reference: `ASSET_DEP_${asset.id}`,
          totalAmount: monthlyDepreciation,
          postedAt: new Date(),
          postedByUserId: user.id,
          lines: {
            create: [
              {
                accountId: data.depreciationExpenseAccountId,
                type: JournalLineType.DEBIT,
                amount: monthlyDepreciation,
                memo: `Depreciation expense`,
              },
              {
                accountId: data.accumulatedDepreciationAccountId,
                type: JournalLineType.CREDIT,
                amount: monthlyDepreciation,
                memo: `Accumulated depreciation`,
              },
            ],
          },
        },
      });

      // Update asset
      const updatedAsset = await tx.fixedAsset.update({
        where: { id: asset.id },
        data: { currentBookValue: newBookValue },
      });

      // Create depreciation record
      const depreciation = await tx.assetDepreciation.create({
        data: {
          assetId: asset.id,
          journalEntryId: je.id,
          periodEndDate: data.periodEndDate,
          depreciationAmount: monthlyDepreciation,
          bookValueAfter: newBookValue,
        },
      });

      return { asset: updatedAsset, depreciation };
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${data.assetId}`);
    return {
      success: true,
      asset: result.asset,
      depreciation: result.depreciation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function disposeAssetAction(
  rawInput: z.input<typeof disposeAssetSchema>
) {
  const user = await requireAuth();
  await requirePermission("ASSET_MANAGE");
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { companyId: true },
  });
  if (!branch) throw new Error("Branch not found");
  const companyId = branch.companyId;

  const parsed = disposeAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({
        where: {
          id: data.assetId,
          companyId,
          branchId,
          deletedAt: null,
          status: "ACTIVE",
        },
      });
      if (!asset) throw new Error("Asset not found or already disposed");

      const gainOrLoss = data.disposalAmount - asset.currentBookValue;
      const accumulatedDepreciation =
        asset.purchaseCost - asset.currentBookValue;

      const lines = [];

      if (data.disposalAmount > 0) {
        lines.push({
          accountId: data.cashAccountId,
          type: JournalLineType.DEBIT,
          amount: data.disposalAmount,
          memo: `Cash received from disposal of ${asset.name}`,
        });
      }

      if (accumulatedDepreciation > 0) {
        lines.push({
          accountId: data.accumulatedDepreciationAccountId,
          type: JournalLineType.DEBIT,
          amount: accumulatedDepreciation,
          memo: `Write-off accumulated depreciation for ${asset.name}`,
        });
      }

      if (gainOrLoss < 0) {
        lines.push({
          accountId: data.lossOnDisposalAccountId,
          type: JournalLineType.DEBIT,
          amount: Math.abs(gainOrLoss),
          memo: `Loss on disposal of ${asset.name}`,
        });
      }

      lines.push({
        accountId: data.fixedAssetAccountId,
        type: JournalLineType.CREDIT,
        amount: asset.purchaseCost,
        memo: `Write-off original cost for ${asset.name}`,
      });

      if (gainOrLoss > 0) {
        lines.push({
          accountId: data.gainOnDisposalAccountId,
          type: JournalLineType.CREDIT,
          amount: gainOrLoss,
          memo: `Gain on disposal of ${asset.name}`,
        });
      }

      const totalAmount = lines
        .filter((l) => l.type === "DEBIT")
        .reduce((sum, l) => sum + l.amount, 0);

      const je = await tx.journalEntry.create({
        data: {
          companyId,
          branchId,
          entryNumber: `DISP-${asset.assetCode}-${Date.now()}`,
          entryDate: new Date(),
          status: JournalStatus.POSTED,
          description: `Disposal of ${asset.name}`,
          reference: `ASSET_DISP_${asset.id}`,
          totalAmount,
          postedAt: new Date(),
          postedByUserId: user.id,
          lines: {
            create: lines,
          },
        },
      });

      const updatedAsset = await tx.fixedAsset.update({
        where: { id: asset.id },
        data: { status: "DISPOSED" },
      });

      return { asset: updatedAsset, je };
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${data.assetId}`);
    return { success: true, asset: result.asset };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
