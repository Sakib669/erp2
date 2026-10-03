import { z } from "zod";
import {
  TicketPriority,
  TicketStatus,
  VehicleReservationStatus,
} from "@prisma/client";

export const createHelpdeskTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
});

export const updateHelpdeskTicketStatusSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  status: z.nativeEnum(TicketStatus),
  assignedToUserId: z.string().optional().nullable(),
});

export const createBranchDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  category: z.string().min(1, "Category is required"),
  fileUrl: z.string().url("Valid URL is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().int().positive("File size must be positive"),
});

export const checkInVisitorSchema = z.object({
  visitorName: z.string().min(1, "Visitor name is required"),
  phone: z.string().optional().nullable(),
  hostEmployeeId: z.string().min(1, "Host employee is required"),
  purpose: z.string().min(1, "Purpose is required"),
  badgeNumber: z.string().optional().nullable(),
});

export const checkOutVisitorSchema = z.object({
  visitorLogId: z.string().min(1, "Visitor log ID is required"),
});

export const createVehicleReservationSchema = z
  .object({
    vehiclePlate: z.string().min(1, "Vehicle plate is required"),
    vehicleModel: z.string().min(1, "Vehicle model is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    purpose: z.string().min(1, "Purpose is required"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const updateVehicleReservationStatusSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID is required"),
  status: z.nativeEnum(VehicleReservationStatus),
});
