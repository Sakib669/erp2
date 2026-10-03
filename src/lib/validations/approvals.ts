import { z } from "zod";
import { EntityType } from "@prisma/client";

export const createApprovalWorkflowSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  branchId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required").max(100),
  entityType: z.nativeEnum(EntityType),
  isActive: z.boolean().default(true),
  steps: z
    .array(
      z.object({
        stepOrder: z.number().int().min(1),
        requiredRoleId: z.string().optional().nullable(),
        requiredUserId: z.string().optional().nullable(),
        thresholdAmount: z.number().int().optional().nullable(),
      })
    )
    .min(1, "At least one step is required"),
});

export const submitApprovalRequestSchema = z.object({
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1, "Entity ID is required"),
});

export const processApprovalActionSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  action: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  comments: z.string().optional(),
});

export const createApprovalDelegationSchema = z.object({
  delegateeUserId: z.string().min(1, "Delegatee is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
