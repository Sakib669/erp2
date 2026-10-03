"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { z } from "zod";
import { TicketStatus } from "@prisma/client";
import {
  createHelpdeskTicketSchema,
  updateHelpdeskTicketStatusSchema,
  createBranchDocumentSchema,
  checkInVisitorSchema,
  checkOutVisitorSchema,
  createVehicleReservationSchema,
  updateVehicleReservationStatusSchema,
} from "@/lib/validations/operations";

async function getBranchContext() {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const branchId = cookieStore.get("branchId")?.value;
  if (!branchId) throw new Error("Branch context required");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  return { user, branchId, companyId: branch.companyId };
}

// ----------------- Helpdesk Tickets -----------------

export async function createHelpdeskTicketAction(
  rawInput: z.input<typeof createHelpdeskTicketSchema>
) {
  const { user, branchId, companyId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  const parsed = createHelpdeskTicketSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const count = await prisma.helpdeskTicket.count({ where: { companyId } });
  const ticketNumber = `TKT-${String(count + 1).padStart(5, "0")}`;

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      companyId,
      branchId,
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: "OPEN",
      createdByUserId: user.id,
    },
  });

  revalidatePath("/operations/tickets");
  revalidatePath("/operations");
  return { success: true, ticket };
}

export async function getHelpdeskTicketsAction(status?: string) {
  const { branchId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  return prisma.helpdeskTicket.findMany({
    where: {
      branchId,
      deletedAt: null,
      ...(status ? { status: status as TicketStatus } : {}),
    },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateHelpdeskTicketStatusAction(
  rawInput: z.input<typeof updateHelpdeskTicketStatusSchema>
) {
  await getBranchContext();
  await requirePermission("OPERATIONS_MANAGE");

  const parsed = updateHelpdeskTicketStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const ticket = await prisma.helpdeskTicket.update({
    where: { id: data.ticketId },
    data: {
      status: data.status,
      assignedToUserId:
        data.assignedToUserId !== undefined ? data.assignedToUserId : undefined,
      resolvedAt:
        data.status === "RESOLVED" || data.status === "CLOSED"
          ? new Date()
          : null,
    },
  });

  revalidatePath("/operations/tickets");
  revalidatePath("/operations");
  return { success: true, ticket };
}

// ----------------- Branch Documents -----------------

export async function createBranchDocumentAction(
  rawInput: z.input<typeof createBranchDocumentSchema>
) {
  const { user, branchId, companyId } = await getBranchContext();
  await requirePermission("OPERATIONS_MANAGE");

  const parsed = createBranchDocumentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const document = await prisma.branchDocument.create({
    data: {
      companyId,
      branchId,
      title: data.title,
      category: data.category,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      uploadedByUserId: user.id,
    },
  });

  revalidatePath("/operations/documents");
  revalidatePath("/operations");
  return { success: true, document };
}

export async function getBranchDocumentsAction(category?: string) {
  const { branchId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  return prisma.branchDocument.findMany({
    where: {
      branchId,
      deletedAt: null,
      ...(category ? { category } : {}),
    },
    include: {
      uploadedByUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ----------------- Visitor Logs -----------------

export async function checkInVisitorAction(
  rawInput: z.input<typeof checkInVisitorSchema>
) {
  const { branchId, companyId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  const parsed = checkInVisitorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const visitor = await prisma.visitorLog.create({
    data: {
      companyId,
      branchId,
      visitorName: data.visitorName,
      phone: data.phone || null,
      hostEmployeeId: data.hostEmployeeId,
      purpose: data.purpose,
      badgeNumber: data.badgeNumber || null,
      checkInTime: new Date(),
    },
  });

  revalidatePath("/operations/visitors");
  revalidatePath("/operations");
  return { success: true, visitor };
}

export async function checkOutVisitorAction(
  rawInput: z.input<typeof checkOutVisitorSchema>
) {
  await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  const parsed = checkOutVisitorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const visitor = await prisma.visitorLog.update({
    where: { id: data.visitorLogId },
    data: { checkOutTime: new Date() },
  });

  revalidatePath("/operations/visitors");
  revalidatePath("/operations");
  return { success: true, visitor };
}

export async function getVisitorLogsAction() {
  const { branchId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  return prisma.visitorLog.findMany({
    where: { branchId },
    include: {
      hostEmployee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { checkInTime: "desc" },
  });
}

// ----------------- Vehicle Reservations -----------------

export async function createVehicleReservationAction(
  rawInput: z.input<typeof createVehicleReservationSchema>
) {
  const { user, branchId, companyId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  const parsed = createVehicleReservationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // Conflict check for overlapping active reservations
  const conflict = await prisma.vehicleReservation.findFirst({
    where: {
      branchId,
      vehiclePlate: data.vehiclePlate,
      status: "CONFIRMED",
      deletedAt: null,
      AND: [
        { startTime: { lt: data.endTime } },
        { endTime: { gt: data.startTime } },
      ],
    },
  });

  if (conflict) {
    return {
      success: false,
      error: "Vehicle is already reserved for this time window",
    };
  }

  const reservation = await prisma.vehicleReservation.create({
    data: {
      companyId,
      branchId,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      reservedByUserId: user.id,
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      status: "CONFIRMED",
    },
  });

  revalidatePath("/operations/vehicles");
  revalidatePath("/operations");
  return { success: true, reservation };
}

export async function getVehicleReservationsAction() {
  const { branchId } = await getBranchContext();
  await requirePermission("OPERATIONS_VIEW");

  return prisma.vehicleReservation.findMany({
    where: { branchId, deletedAt: null },
    include: {
      reservedByUser: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "desc" },
  });
}

export async function updateVehicleReservationStatusAction(
  rawInput: z.input<typeof updateVehicleReservationStatusSchema>
) {
  await getBranchContext();
  await requirePermission("OPERATIONS_MANAGE");

  const parsed = updateVehicleReservationStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const reservation = await prisma.vehicleReservation.update({
    where: { id: data.reservationId },
    data: { status: data.status },
  });

  revalidatePath("/operations/vehicles");
  revalidatePath("/operations");
  return { success: true, reservation };
}
