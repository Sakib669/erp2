import { z } from "zod";

export const punchTypeEnum = z.enum([
  "CHECK_IN",
  "CHECK_OUT",
  "BREAK_OUT",
  "BREAK_IN",
  "AUTO",
]);

export const attendanceStatusEnum = z.enum([
  "PRESENT",
  "LATE",
  "HALF_DAY",
  "ABSENT",
  "ON_LEAVE",
  "HOLIDAY",
]);

export const singlePunchSchema = z.object({
  employeeNumber: z.string().min(1, "Employee number is required"),
  punchTime: z.string().or(z.date()),
  punchType: punchTypeEnum.default("AUTO"),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export const ingestPunchesSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  punches: z.array(singlePunchSchema).min(1, "At least one punch is required"),
});

export type IngestPunchesInput = z.input<typeof ingestPunchesSchema>;

export const manualAttendanceCorrectionSchema = z.object({
  id: z.string().min(1, "Attendance Record ID is required"),
  checkIn: z.string().or(z.date()).optional().nullable(),
  checkOut: z.string().or(z.date()).optional().nullable(),
  status: attendanceStatusEnum,
  reason: z
    .string()
    .trim()
    .min(3, "Reason for manual correction must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type ManualAttendanceCorrectionInput = z.input<
  typeof manualAttendanceCorrectionSchema
>;

export const processAttendanceSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type ProcessAttendanceInput = z.input<typeof processAttendanceSchema>;

export const queryAttendanceSchema = z.object({
  branchId: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  departmentId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export type QueryAttendanceInput = z.input<typeof queryAttendanceSchema>;
