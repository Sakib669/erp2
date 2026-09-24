"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Briefcase,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
} from "@/actions/hr-actions";

export interface EmployeeItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  joinDate: string;
  confirmationDate: string | null;
  status: string;
  employmentType: string;
  baseSalary: number;
  bankName: string | null;
  bankAccount: string | null;
  emergencyContact: string | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  designation: {
    id: string;
    title: string;
    code: string;
  };
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentOption {
  id: string;
  branchId: string;
  name: string;
  code: string;
}

export interface DesignationOption {
  id: string;
  title: string;
  code: string;
}

export interface ShiftOption {
  id: string;
  branchId: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface EmployeeManagerProps {
  employees: EmployeeItem[];
  branches: BranchOption[];
  departments: DepartmentOption[];
  designations: DesignationOption[];
  shifts: ShiftOption[];
  companyId: string;
  currentBranchId?: string;
  currency?: string;
}

export function EmployeeManager({
  employees: initialEmployees,
  branches,
  departments,
  designations,
  shifts,
  companyId,
  currentBranchId,
  currency = "USD",
}: EmployeeManagerProps) {
  const router = useRouter();
  const [employees, setEmployees] =
    React.useState<EmployeeItem[]>(initialEmployees);

  React.useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string>(
    currentBranchId || "ALL"
  );
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Notifications
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] =
    React.useState<EmployeeItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Create Form State
  const [formBranchId, setFormBranchId] = React.useState(
    currentBranchId || branches[0]?.id || ""
  );
  const [formDepartmentId, setFormDepartmentId] = React.useState("");
  const [formDesignationId, setFormDesignationId] = React.useState(
    designations[0]?.id || ""
  );
  const [formShiftId, setFormShiftId] = React.useState("NONE");
  const [formEmpNumber, setFormEmpNumber] = React.useState("");
  const [formFirstName, setFormFirstName] = React.useState("");
  const [formLastName, setFormLastName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formJoinDate, setFormJoinDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [formStatus, setFormStatus] = React.useState("ACTIVE");
  const [formEmploymentType, setFormEmploymentType] =
    React.useState("FULL_TIME");
  const [formSalary, setFormSalary] = React.useState("5000");
  const [formBankName, setFormBankName] = React.useState("");
  const [formBankAccount, setFormBankAccount] = React.useState("");

  // Edit Form State
  const [editFirstName, setEditFirstName] = React.useState("");
  const [editLastName, setEditLastName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editBranchId, setEditBranchId] = React.useState("");
  const [editDepartmentId, setEditDepartmentId] = React.useState("");
  const [editDesignationId, setEditDesignationId] = React.useState("");
  const [editShiftId, setEditShiftId] = React.useState("NONE");
  const [editStatus, setEditStatus] = React.useState("ACTIVE");
  const [editEmploymentType, setEditEmploymentType] =
    React.useState("FULL_TIME");
  const [editSalary, setEditSalary] = React.useState("0");

  // Filtered department options based on selected branch in form
  const branchDepartments = departments.filter(
    (d) => d.branchId === formBranchId
  );
  const editBranchDepartments = departments.filter(
    (d) => d.branchId === editBranchId
  );

  // Set default department when formBranchId changes
  React.useEffect(() => {
    if (branchDepartments.length > 0 && !formDepartmentId) {
      setFormDepartmentId(branchDepartments[0].id);
    }
  }, [formBranchId, branchDepartments, formDepartmentId]);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch =
      branchFilter === "ALL" || emp.branch.id === branchFilter;

    const matchesDepartment =
      departmentFilter === "ALL" || emp.department.id === departmentFilter;

    const matchesStatus = statusFilter === "ALL" || emp.status === statusFilter;

    return matchesSearch && matchesBranch && matchesDepartment && matchesStatus;
  });

  // Calculate Metrics
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const probationCount = employees.filter(
    (e) => e.status === "PROBATION"
  ).length;
  const inactiveCount = employees.filter(
    (e) => e.status === "TERMINATED" || e.status === "RESIGNED"
  ).length;

  function openCreateModal() {
    setErrorMsg(null);
    setSuccessMsg(null);
    const initialBranch = currentBranchId || branches[0]?.id || "";
    setFormBranchId(initialBranch);
    const availableDepts = departments.filter(
      (d) => d.branchId === initialBranch
    );
    setFormDepartmentId(availableDepts[0]?.id || "");
    setFormDesignationId(designations[0]?.id || "");
    setFormShiftId("NONE");
    setFormEmpNumber(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormJoinDate(new Date().toISOString().split("T")[0]);
    setFormStatus("ACTIVE");
    setFormEmploymentType("FULL_TIME");
    setFormSalary("5000");
    setFormBankName("");
    setFormBankAccount("");
    setIsCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const salaryNumber = Math.round(parseFloat(formSalary) * 100);

    const res = await createEmployeeAction({
      companyId,
      branchId: formBranchId,
      departmentId: formDepartmentId,
      designationId: formDesignationId,
      shiftId: formShiftId === "NONE" ? null : formShiftId,
      employeeNumber: formEmpNumber.trim(),
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || null,
      joinDate: formJoinDate,
      status: formStatus as
        "ACTIVE" | "PROBATION" | "SUSPENDED" | "TERMINATED" | "RESIGNED",
      employmentType: formEmploymentType as
        "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
      baseSalary: isNaN(salaryNumber) ? 0 : salaryNumber,
      bankName: formBankName.trim() || null,
      bankAccount: formBankAccount.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to enroll employee");
      return;
    }

    setSuccessMsg(
      `Employee '${formFirstName} ${formLastName}' enrolled successfully`
    );
    setIsCreateOpen(false);
    router.refresh();
  }

  function openEditModal(emp: EmployeeItem) {
    setEditingEmployee(emp);
    setEditFirstName(emp.firstName);
    setEditLastName(emp.lastName);
    setEditEmail(emp.email);
    setEditPhone(emp.phone || "");
    setEditBranchId(emp.branch.id);
    setEditDepartmentId(emp.department.id);
    setEditDesignationId(emp.designation.id);
    setEditShiftId(emp.shift?.id || "NONE");
    setEditStatus(emp.status);
    setEditEmploymentType(emp.employmentType);
    setEditSalary((emp.baseSalary / 100).toFixed(2));
    setErrorMsg(null);
    setIsEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const salaryNumber = Math.round(parseFloat(editSalary) * 100);

    const res = await updateEmployeeAction({
      id: editingEmployee.id,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim() || null,
      branchId: editBranchId,
      departmentId: editDepartmentId,
      designationId: editDesignationId,
      shiftId: editShiftId === "NONE" ? null : editShiftId,
      status: editStatus as
        "ACTIVE" | "PROBATION" | "SUSPENDED" | "TERMINATED" | "RESIGNED",
      employmentType: editEmploymentType as
        "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
      baseSalary: isNaN(salaryNumber)
        ? editingEmployee.baseSalary
        : salaryNumber,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update employee");
      return;
    }

    setSuccessMsg("Employee details updated successfully");
    setIsEditOpen(false);
    setEditingEmployee(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deletingId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteEmployeeAction(deletingId);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to archive employee record");
      setIsDeleteOpen(false);
      return;
    }

    setSuccessMsg("Employee record archived successfully");
    setIsDeleteOpen(false);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header and Quick Links */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground text-sm">
            Manage employee directory, profiles, shifts, and career records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/hr/designations" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Designations
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/hr/shifts" className="gap-2">
              <Clock className="h-4 w-4" />
              Work Shifts
            </Link>
          </Button>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Headcount
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-muted-foreground text-xs">
              Total registered personnel
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-muted-foreground text-xs">
              Fully active team members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Probation</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{probationCount}</div>
            <p className="text-muted-foreground text-xs">
              Probationary onboarding period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
            <p className="text-muted-foreground text-xs">
              Terminated or resigned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Directory Table and Filter Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="text-primary h-5 w-5" />
                Workforce Records
              </CardTitle>
              <CardDescription>
                Filter and inspect staff across all branches
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40">
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PROBATION">Probation</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                    <SelectItem value="RESIGNED">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch & Dept</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No employee records found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="font-medium">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {emp.email} • {emp.employeeNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {emp.branch.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {emp.department.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {emp.designation.title}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.shift ? (
                          <div className="text-xs">
                            <span className="font-medium">
                              {emp.shift.name}
                            </span>
                            <div className="text-muted-foreground font-mono">
                              {emp.shift.startTime} – {emp.shift.endTime}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.status === "ACTIVE"
                              ? "default"
                              : emp.status === "PROBATION"
                                ? "outline"
                                : "destructive"
                          }
                          className="text-xs capitalize"
                        >
                          {emp.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs">
                          {emp.employmentType.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">
                          {currency === "USD" ? "$" : `${currency} `}
                          {(emp.baseSalary / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="View Employee Profile"
                          >
                            <Link href={`/hr/employees/${emp.id}`}>
                              <Eye className="text-primary h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(emp.id);
                              setIsDeleteOpen(true);
                            }}
                            title="Archive Employee"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Employee Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Enroll New Employee</DialogTitle>
              <DialogDescription>
                Create an official personnel profile with organizational
                assignments
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Personal Information */}
              <div className="text-foreground border-b pb-2 font-semibold">
                Personal Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-firstname">First Name</Label>
                  <Input
                    id="emp-firstname"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-lastname">Last Name</Label>
                  <Input
                    id="emp-lastname"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-email">Email Address</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-phone">Phone Number</Label>
                  <Input
                    id="emp-phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Organization Assignment */}
              <div className="text-foreground border-b pt-2 pb-2 font-semibold">
                Assignment & Structure
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-branch">Physical Branch</Label>
                  <Select
                    value={formBranchId}
                    onValueChange={(val) => {
                      setFormBranchId(val);
                      const depts = departments.filter(
                        (d) => d.branchId === val
                      );
                      if (depts.length > 0) {
                        setFormDepartmentId(depts[0].id);
                      }
                    }}
                  >
                    <SelectTrigger id="emp-branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-dept">Department</Label>
                  <Select
                    value={formDepartmentId}
                    onValueChange={setFormDepartmentId}
                  >
                    <SelectTrigger id="emp-dept">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-desig">Designation</Label>
                  <Select
                    value={formDesignationId}
                    onValueChange={setFormDesignationId}
                  >
                    <SelectTrigger id="emp-desig">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((des) => (
                        <SelectItem key={des.id} value={des.id}>
                          {des.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-shift">Work Shift</Label>
                  <Select value={formShiftId} onValueChange={setFormShiftId}>
                    <SelectTrigger id="emp-shift">
                      <SelectValue placeholder="Select shift (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Unassigned</SelectItem>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.startTime} – {s.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employment & Compensation */}
              <div className="text-foreground border-b pt-2 pb-2 font-semibold">
                Terms & Compensation
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-num">Employee Number</Label>
                  <Input
                    id="emp-num"
                    value={formEmpNumber}
                    onChange={(e) => setFormEmpNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-join">Join Date</Label>
                  <Input
                    id="emp-join"
                    type="date"
                    value={formJoinDate}
                    onChange={(e) => setFormJoinDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-status">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger id="emp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PROBATION">Probation</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-type">Employment Type</Label>
                  <Select
                    value={formEmploymentType}
                    onValueChange={setFormEmploymentType}
                  >
                    <SelectTrigger id="emp-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-salary">Base Monthly Salary ($)</Label>
                  <Input
                    id="emp-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp-bank">Bank Name (Optional)</Label>
                  <Input
                    id="emp-bank"
                    placeholder="e.g. Chase"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-acct">Account Number (Optional)</Label>
                  <Input
                    id="emp-acct"
                    placeholder="e.g. 123456789"
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enrolling..." : "Enroll Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Employee Details</DialogTitle>
              <DialogDescription>
                Update operational attributes for {editingEmployee?.firstName}{" "}
                {editingEmployee?.lastName}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-fname">First Name</Label>
                  <Input
                    id="edit-fname"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lname">Last Name</Label>
                  <Input
                    id="edit-lname"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-branch">Branch</Label>
                  <Select
                    value={editBranchId}
                    onValueChange={(val) => {
                      setEditBranchId(val);
                      const depts = departments.filter(
                        (d) => d.branchId === val
                      );
                      if (depts.length > 0) {
                        setEditDepartmentId(depts[0].id);
                      }
                    }}
                  >
                    <SelectTrigger id="edit-branch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-dept">Department</Label>
                  <Select
                    value={editDepartmentId}
                    onValueChange={setEditDepartmentId}
                  >
                    <SelectTrigger id="edit-dept">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editBranchDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-desig">Designation</Label>
                  <Select
                    value={editDesignationId}
                    onValueChange={setEditDesignationId}
                  >
                    <SelectTrigger id="edit-desig">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((des) => (
                        <SelectItem key={des.id} value={des.id}>
                          {des.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-shift">Shift</Label>
                  <Select value={editShiftId} onValueChange={setEditShiftId}>
                    <SelectTrigger id="edit-shift">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Unassigned</SelectItem>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PROBATION">Probation</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                      <SelectItem value="RESIGNED">Resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editEmploymentType}
                    onValueChange={setEditEmploymentType}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sal">Base Salary ($)</Label>
                  <Input
                    id="edit-sal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Employee Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this employee record? The record
              will be preserved with soft deletion, keeping historical payroll
              and attendance ledgers intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Archiving..." : "Archive Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
