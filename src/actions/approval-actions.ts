"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import {
  createApprovalWorkflowSchema,
  submitApprovalRequestSchema,
  processApprovalActionSchema,
  createApprovalDelegationSchema,
} from "@/lib/validations/approvals";
import { z } from "zod";
import { EntityType } from "@prisma/client";

export async function createApprovalWorkflowAction(
  rawInput: z.input<typeof createApprovalWorkflowSchema>
) {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");

  const parsed = createApprovalWorkflowSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const workflow = await prisma.approvalWorkflow.create({
    data: {
      companyId: data.companyId,
      branchId: data.branchId || null,
      name: data.name,
      entityType: data.entityType,
      isActive: data.isActive,
      steps: {
        create: data.steps.map((step) => ({
          stepOrder: step.stepOrder,
          requiredRoleId: step.requiredRoleId || null,
          requiredUserId: step.requiredUserId || null,
          thresholdAmount: step.thresholdAmount || null,
        })),
      },
    },
  });

  revalidatePath("/admin/workflows");
  return { success: true, workflow };
}

export async function getApprovalWorkflowsAction() {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  const companyId = branch.companyId;

  return prisma.approvalWorkflow.findMany({
    where: { companyId, deletedAt: null },
    include: {
      steps: {
        include: {
          requiredRole: true,
          requiredUser: true,
        },
        orderBy: { stepOrder: "asc" },
      },
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitApprovalRequestAction(
  rawInput: z.input<typeof submitApprovalRequestSchema>
) {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch ID required");

  const parsed = submitApprovalRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, error: "Branch not found" };

  // Find matching workflow
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      companyId: branch.companyId,
      entityType: data.entityType,
      isActive: true,
      OR: [{ branchId: null }, { branchId }],
      deletedAt: null,
    },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!workflow || workflow.steps.length === 0) {
    // Auto-approve if no workflow
    await applyEntityStatusChange(
      data.entityType,
      data.entityId,
      "APPROVED",
      user.id
    );
    return { success: true, message: "No workflow found. Auto-approved." };
  }

  const firstStep = workflow.steps[0];

  const request = await prisma.approvalRequest.create({
    data: {
      companyId: branch.companyId,
      branchId,
      workflowId: workflow.id,
      entityType: data.entityType,
      entityId: data.entityId,
      status: "PENDING",
      currentStepId: firstStep.id,
      requestedByUserId: user.id,
    },
  });

  revalidatePath("/approvals");
  return { success: true, request };
}

export async function getPendingApprovalsAction() {
  const user = await requireAuth();

  // Find delegations where user is delegatee
  const delegations = await prisma.approvalDelegation.findMany({
    where: {
      delegateeUserId: user.id,
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  });

  const delegatedUserIds = delegations.map((d) => d.delegatorUserId);
  const applicableUserIds = [user.id, ...delegatedUserIds];

  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
  });
  const roleIds = userRoles.map((ur) => ur.roleId);

  return prisma.approvalRequest.findMany({
    where: {
      status: "PENDING",
      currentStep: {
        OR: [
          { requiredUserId: { in: applicableUserIds } },
          { requiredRoleId: { in: roleIds } },
        ],
      },
    },
    include: {
      workflow: true,
      currentStep: {
        include: {
          requiredRole: true,
          requiredUser: true,
        },
      },
      requestedByUser: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function processApprovalAction(
  rawInput: z.input<typeof processApprovalActionSchema>
) {
  const user = await requireAuth();

  const parsed = processApprovalActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const request = await prisma.approvalRequest.findUnique({
    where: { id: data.requestId },
    include: {
      currentStep: true,
      workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
    },
  });

  if (!request || request.status !== "PENDING" || !request.currentStepId) {
    return { success: false, error: "Invalid or inactive request" };
  }

  // Record action
  await prisma.approvalAction.create({
    data: {
      requestId: request.id,
      stepId: request.currentStepId,
      actorUserId: user.id,
      action: data.action,
      comments: data.comments,
    },
  });

  if (data.action === "REJECTED" || data.action === "CHANGES_REQUESTED") {
    await prisma.approvalRequest.update({
      where: { id: request.id },
      data: { status: data.action },
    });
    await applyEntityStatusChange(
      request.entityType,
      request.entityId,
      data.action,
      user.id
    );
  } else if (data.action === "APPROVED") {
    const currentStepIndex = request.workflow.steps.findIndex(
      (s) => s.id === request.currentStepId
    );
    const nextStep = request.workflow.steps[currentStepIndex + 1];

    if (nextStep) {
      await prisma.approvalRequest.update({
        where: { id: request.id },
        data: { currentStepId: nextStep.id },
      });
    } else {
      await prisma.approvalRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });
      await applyEntityStatusChange(
        request.entityType,
        request.entityId,
        "APPROVED",
        user.id
      );
    }
  }

  revalidatePath("/approvals");
  return { success: true };
}

async function applyEntityStatusChange(
  entityType: EntityType,
  entityId: string,
  status: string,
  actorUserId: string
) {
  // Map ApprovalStatus to domain status
  if (entityType === "PURCHASE_ORDER") {
    const mappedStatus =
      status === "APPROVED"
        ? "APPROVED"
        : status === "REJECTED"
          ? "CANCELLED"
          : "DRAFT";
    await prisma.purchaseOrder.update({
      where: { id: entityId },
      data: {
        status: mappedStatus,
        approvedByUserId: status === "APPROVED" ? actorUserId : null,
      },
    });
  } else if (entityType === "LEAVE_REQUEST") {
    const mappedStatus =
      status === "APPROVED"
        ? "APPROVED"
        : status === "REJECTED"
          ? "REJECTED"
          : "PENDING";
    await prisma.leaveRequest.update({
      where: { id: entityId },
      data: { status: mappedStatus },
    });
  }
}

export async function createApprovalDelegationAction(
  rawInput: z.input<typeof createApprovalDelegationSchema>
) {
  const user = await requireAuth();

  const parsed = createApprovalDelegationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const delegation = await prisma.approvalDelegation.create({
    data: {
      delegatorUserId: user.id,
      delegateeUserId: data.delegateeUserId,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

  revalidatePath("/approvals/delegations");
  return { success: true, delegation };
}
