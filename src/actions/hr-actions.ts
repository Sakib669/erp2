"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withAuditTransaction } from "@/lib/audit";
import {
  createDesignationSchema,
  updateDesignationSchema,
  createShiftSchema,
  updateShiftSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  recordEmployeeTransitionSchema,
  type CreateDesignationInput,
  type UpdateDesignationInput,
  type CreateShiftInput,
  type UpdateShiftInput,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type RecordEmployeeTransitionInput,
} from "@/lib/validations/hr";
import { EmployeeStatus, EmploymentType, TransitionType } from "@prisma/client";

// -------------------------------------------------------------
// Designation Actions
// -------------------------------------------------------------

export async function createDesignationAction(
  rawInput: CreateDesignationInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = createDesignationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.designation.findFirst({
    where: {
      companyId: data.companyId,
      code: data.code,
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Designation code '${data.code}' already exists for this company`,
    };
  }

  const designation = await withAuditTransaction(
    { userId: user.id },
    { action: "CREATE", entity: "Designation", entityId: "" },
    async (tx) => {
      return tx.designation.create({
        data: {
          companyId: data.companyId,
          title: data.title,
          code: data.code,
          description: data.description,
        },
      });
    }
  );

  revalidatePath("/hr/designations");
  revalidatePath("/hr");
  return { success: true, designation };
}

export async function updateDesignationAction(
  rawInput: UpdateDesignationInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = updateDesignationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.designation.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Designation not found" };
  }

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.designation.findFirst({
      where: {
        companyId: existing.companyId,
        code: data.code,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Designation code '${data.code}' is already used by another designation`,
      };
    }
  }

  const designation = await withAuditTransaction(
    { userId: user.id },
    {
      action: "UPDATE",
      entity: "Designation",
      entityId: id,
      before: existing,
    },
    async (tx) => {
      return tx.designation.update({
        where: { id },
        data: {
          title: data.title ?? existing.title,
          code: data.code ?? existing.code,
          description:
            data.description !== undefined
              ? data.description
              : existing.description,
        },
      });
    }
  );

  revalidatePath("/hr/designations");
  revalidatePath("/hr");
  return { success: true, designation };
}

export async function deleteDesignationAction(designationId: string) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const existing = await prisma.designation.findFirst({
    where: { id: designationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Designation not found" };
  }

  const assignedEmployeesCount = await prisma.employee.count({
    where: { designationId, deletedAt: null },
  });

  if (assignedEmployeesCount > 0) {
    return {
      success: false,
      error: `Cannot delete designation assigned to ${assignedEmployeesCount} active employees`,
    };
  }

  await withAuditTransaction(
    { userId: user.id },
    {
      action: "DELETE",
      entity: "Designation",
      entityId: designationId,
      before: existing,
    },
    async (tx) => {
      return tx.designation.update({
        where: { id: designationId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/hr/designations");
  revalidatePath("/hr");
  return { success: true };
}

export async function getDesignationsAction(companyId?: string) {
  await requireAuth();
  await requirePermission("HR_VIEW");

  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    targetCompanyId = firstCompany?.id;
  }

  if (!targetCompanyId) {
    return { success: true, designations: [] };
  }

  const designations = await prisma.designation.findMany({
    where: {
      companyId: targetCompanyId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  return { success: true, designations };
}

// -------------------------------------------------------------
// Shift Actions
// -------------------------------------------------------------

export async function createShiftAction(rawInput: CreateShiftInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = createShiftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.shift.findFirst({
    where: {
      branchId: data.branchId,
      code: data.code,
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Shift code '${data.code}' already exists in this branch`,
    };
  }

  const shift = await withAuditTransaction(
    { userId: user.id, branchId: data.branchId },
    { action: "CREATE", entity: "Shift", entityId: "" },
    async (tx) => {
      return tx.shift.create({
        data: {
          branchId: data.branchId,
          name: data.name,
          code: data.code,
          startTime: data.startTime,
          endTime: data.endTime,
          gracePeriodMinutes: data.gracePeriodMinutes,
        },
      });
    }
  );

  revalidatePath("/hr/shifts");
  return { success: true, shift };
}

export async function updateShiftAction(rawInput: UpdateShiftInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = updateShiftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.shift.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Shift not found" };
  }

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.shift.findFirst({
      where: {
        branchId: existing.branchId,
        code: data.code,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Shift code '${data.code}' is already used in this branch`,
      };
    }
  }

  const shift = await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    { action: "UPDATE", entity: "Shift", entityId: id, before: existing },
    async (tx) => {
      return tx.shift.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          code: data.code ?? existing.code,
          startTime: data.startTime ?? existing.startTime,
          endTime: data.endTime ?? existing.endTime,
          gracePeriodMinutes:
            data.gracePeriodMinutes ?? existing.gracePeriodMinutes,
        },
      });
    }
  );

  revalidatePath("/hr/shifts");
  return { success: true, shift };
}

export async function deleteShiftAction(shiftId: string) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const existing = await prisma.shift.findFirst({
    where: { id: shiftId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Shift not found" };
  }

  const assignedEmployeesCount = await prisma.employee.count({
    where: { shiftId, deletedAt: null },
  });

  if (assignedEmployeesCount > 0) {
    return {
      success: false,
      error: `Cannot delete shift assigned to ${assignedEmployeesCount} active employees`,
    };
  }

  await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    { action: "DELETE", entity: "Shift", entityId: shiftId, before: existing },
    async (tx) => {
      return tx.shift.update({
        where: { id: shiftId },
        data: { deletedAt: new Date() },
      });
    }
  );

  revalidatePath("/hr/shifts");
  return { success: true };
}

export async function getShiftsAction(branchId?: string) {
  const user = await requireAuth();
  await requirePermission("HR_VIEW");

  const targetBranchId = branchId || user.activeBranchId;

  const shifts = await prisma.shift.findMany({
    where: {
      deletedAt: null,
      ...(targetBranchId ? { branchId: targetBranchId } : {}),
    },
    include: {
      branch: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return { success: true, shifts };
}

// -------------------------------------------------------------
// Employee Actions
// -------------------------------------------------------------

export async function createEmployeeAction(rawInput: CreateEmployeeInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = createEmployeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  // Check unique employeeNumber in company
  const existingNumber = await prisma.employee.findFirst({
    where: {
      companyId: data.companyId,
      employeeNumber: data.employeeNumber,
      deletedAt: null,
    },
  });
  if (existingNumber) {
    return {
      success: false,
      error: `Employee number '${data.employeeNumber}' is already registered`,
    };
  }

  // Check unique email in company
  const existingEmail = await prisma.employee.findFirst({
    where: {
      companyId: data.companyId,
      email: data.email,
      deletedAt: null,
    },
  });
  if (existingEmail) {
    return {
      success: false,
      error: `Employee email '${data.email}' is already registered`,
    };
  }

  // If userId provided, check it is unique
  if (data.userId) {
    const existingUserEmployee = await prisma.employee.findFirst({
      where: {
        userId: data.userId,
        deletedAt: null,
      },
    });
    if (existingUserEmployee) {
      return {
        success: false,
        error:
          "This user account is already linked to another employee profile",
      };
    }
  }

  const employee = await withAuditTransaction(
    { userId: user.id, branchId: data.branchId },
    { action: "CREATE", entity: "Employee", entityId: "" },
    async (tx) => {
      const created = await tx.employee.create({
        data: {
          companyId: data.companyId,
          branchId: data.branchId,
          departmentId: data.departmentId,
          designationId: data.designationId,
          shiftId: data.shiftId || null,
          userId: data.userId || null,
          employeeNumber: data.employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          joinDate: new Date(data.joinDate),
          confirmationDate: data.confirmationDate
            ? new Date(data.confirmationDate)
            : null,
          status: data.status as EmployeeStatus,
          employmentType: data.employmentType as EmploymentType,
          baseSalary: data.baseSalary,
          bankName: data.bankName || null,
          bankAccount: data.bankAccount || null,
          emergencyContact: data.emergencyContact || null,
        },
      });

      // Record initial career transition event
      await tx.employeeTransition.create({
        data: {
          employeeId: created.id,
          transitionType: TransitionType.HIRED,
          effectiveDate: new Date(data.joinDate),
          toBranchId: data.branchId,
          toDepartmentId: data.departmentId,
          toDesignationId: data.designationId,
          previousSalary: null,
          newSalary: data.baseSalary,
          remarks: "Initial employee onboarding and enrollment",
          approvedByUserId: user.id,
        },
      });

      return created;
    }
  );

  revalidatePath("/hr");
  return { success: true, employee };
}

export async function updateEmployeeAction(rawInput: UpdateEmployeeInput) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = updateEmployeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Employee record not found" };
  }

  if (data.email && data.email !== existing.email) {
    const duplicateEmail = await prisma.employee.findFirst({
      where: {
        companyId: existing.companyId,
        email: data.email,
        deletedAt: null,
        id: { not: id },
      },
    });
    if (duplicateEmail) {
      return {
        success: false,
        error: `Email '${data.email}' is already registered to another employee`,
      };
    }
  }

  const employee = await withAuditTransaction(
    { userId: user.id, branchId: data.branchId ?? existing.branchId },
    { action: "UPDATE", entity: "Employee", entityId: id, before: existing },
    async (tx) => {
      return tx.employee.update({
        where: { id },
        data: {
          branchId: data.branchId ?? existing.branchId,
          departmentId: data.departmentId ?? existing.departmentId,
          designationId: data.designationId ?? existing.designationId,
          shiftId: data.shiftId !== undefined ? data.shiftId : existing.shiftId,
          firstName: data.firstName ?? existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          email: data.email ?? existing.email,
          phone: data.phone !== undefined ? data.phone : existing.phone,
          dateOfBirth:
            data.dateOfBirth !== undefined
              ? data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : null
              : existing.dateOfBirth,
          gender: data.gender !== undefined ? data.gender : existing.gender,
          joinDate: data.joinDate ? new Date(data.joinDate) : existing.joinDate,
          confirmationDate:
            data.confirmationDate !== undefined
              ? data.confirmationDate
                ? new Date(data.confirmationDate)
                : null
              : existing.confirmationDate,
          status: (data.status as EmployeeStatus) ?? existing.status,
          employmentType:
            (data.employmentType as EmploymentType) ?? existing.employmentType,
          baseSalary: data.baseSalary ?? existing.baseSalary,
          bankName:
            data.bankName !== undefined ? data.bankName : existing.bankName,
          bankAccount:
            data.bankAccount !== undefined
              ? data.bankAccount
              : existing.bankAccount,
          emergencyContact:
            data.emergencyContact !== undefined
              ? data.emergencyContact
              : existing.emergencyContact,
        },
      });
    }
  );

  revalidatePath("/hr");
  revalidatePath(`/hr/employees/${id}`);
  return { success: true, employee };
}

export async function deleteEmployeeAction(employeeId: string) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const existing = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Employee record not found" };
  }

  await withAuditTransaction(
    { userId: user.id, branchId: existing.branchId },
    {
      action: "DELETE",
      entity: "Employee",
      entityId: employeeId,
      before: existing,
    },
    async (tx) => {
      return tx.employee.update({
        where: { id: employeeId },
        data: {
          deletedAt: new Date(),
          status: EmployeeStatus.TERMINATED,
        },
      });
    }
  );

  revalidatePath("/hr");
  return { success: true };
}

export async function recordEmployeeTransitionAction(
  rawInput: RecordEmployeeTransitionInput
) {
  const user = await requireAuth();
  await requirePermission("HR_MANAGE");

  const parsed = recordEmployeeTransitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  const existing = await prisma.employee.findFirst({
    where: { id: data.employeeId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Employee not found" };
  }

  const transition = await withAuditTransaction(
    { userId: user.id, branchId: data.toBranchId ?? existing.branchId },
    {
      action: "CAREER_TRANSITION",
      entity: "EmployeeTransition",
      entityId: "",
      before: {
        employee: existing,
        transitionType: data.transitionType,
      },
    },
    async (tx) => {
      const record = await tx.employeeTransition.create({
        data: {
          employeeId: data.employeeId,
          transitionType: data.transitionType as TransitionType,
          effectiveDate: new Date(data.effectiveDate),
          fromBranchId: existing.branchId,
          toBranchId: data.toBranchId || existing.branchId,
          fromDepartmentId: existing.departmentId,
          toDepartmentId: data.toDepartmentId || existing.departmentId,
          fromDesignationId: existing.designationId,
          toDesignationId: data.toDesignationId || existing.designationId,
          previousSalary: existing.baseSalary,
          newSalary: data.newSalary ?? existing.baseSalary,
          remarks: data.remarks || null,
          approvedByUserId: user.id,
        },
      });

      // Update employee active attributes based on transition
      let nextStatus = existing.status;
      if (data.transitionType === "SUSPENSION") {
        nextStatus = EmployeeStatus.SUSPENDED;
      } else if (data.transitionType === "TERMINATION") {
        nextStatus = EmployeeStatus.TERMINATED;
      } else if (data.transitionType === "RESIGNATION") {
        nextStatus = EmployeeStatus.RESIGNED;
      }

      await tx.employee.update({
        where: { id: data.employeeId },
        data: {
          branchId: data.toBranchId || existing.branchId,
          departmentId: data.toDepartmentId || existing.departmentId,
          designationId: data.toDesignationId || existing.designationId,
          baseSalary: data.newSalary ?? existing.baseSalary,
          status: nextStatus,
        },
      });

      return record;
    }
  );

  revalidatePath("/hr");
  revalidatePath(`/hr/employees/${data.employeeId}`);
  return { success: true, transition };
}

export async function getEmployeesAction(filters?: {
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  status?: string;
  search?: string;
}) {
  const user = await requireAuth();
  await requirePermission("HR_VIEW");

  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };

  if (filters?.branchId) {
    whereClause.branchId = filters.branchId;
  } else if (user.activeBranchId && !user.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = user.activeBranchId;
  }

  if (filters?.departmentId) {
    whereClause.departmentId = filters.departmentId;
  }

  if (filters?.designationId) {
    whereClause.designationId = filters.designationId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.search) {
    whereClause.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { employeeNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, title: true, code: true } },
      shift: {
        select: { id: true, name: true, startTime: true, endTime: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, employees };
}

export async function getEmployeeByIdAction(employeeId: string) {
  await requireAuth();
  await requirePermission("HR_VIEW");

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      deletedAt: null,
    },
    include: {
      company: { select: { id: true, name: true, currency: true } },
      branch: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, title: true, code: true } },
      shift: {
        select: { id: true, name: true, startTime: true, endTime: true },
      },
      user: { select: { id: true, name: true, email: true } },
      transitions: {
        orderBy: { effectiveDate: "desc" },
      },
    },
  });

  if (!employee) {
    return { success: false, error: "Employee record not found" };
  }

  return { success: true, employee };
}
