import { z } from "zod";

export const createFixedAssetSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  assetCode: z
    .string()
    .min(1, "Asset code is required")
    .max(50, "Asset code cannot exceed 50 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  purchaseDate: z.coerce.date(),
  purchaseCost: z
    .number()
    .int()
    .nonnegative("Purchase cost must be a non-negative integer"),
  usefulLifeYears: z.number().int().positive("Useful life must be positive"),
  salvageValue: z
    .number()
    .int()
    .nonnegative("Salvage value must be a non-negative integer"),
});

export const runDepreciationSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  periodEndDate: z.coerce.date(),
  depreciationExpenseAccountId: z
    .string()
    .min(1, "Depreciation Expense Account is required"),
  accumulatedDepreciationAccountId: z
    .string()
    .min(1, "Accumulated Depreciation Account is required"),
});

export const disposeAssetSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  disposalAmount: z
    .number()
    .int()
    .nonnegative("Disposal amount must be a non-negative integer"),
  fixedAssetAccountId: z.string().min(1, "Fixed Asset Account is required"),
  cashAccountId: z.string().min(1, "Cash Account is required"),
  accumulatedDepreciationAccountId: z
    .string()
    .min(1, "Accumulated Depreciation Account is required"),
  lossOnDisposalAccountId: z
    .string()
    .min(1, "Loss on Disposal Account is required"),
  gainOnDisposalAccountId: z
    .string()
    .min(1, "Gain on Disposal Account is required"),
});
