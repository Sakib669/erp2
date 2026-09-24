"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  User,
  TrendingUp,
  History,
  AlertCircle,
  CheckCircle2,
  CreditCard,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recordEmployeeTransitionAction } from "@/actions/hr-actions";

export interface TransitionHistoryItem {
  id: string;
  transitionType: string;
  effectiveDate: string | Date;
  fromBranchId: string | null;
  toBranchId: string | null;
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  fromDesignationId: string | null;
  toDesignationId: string | null;
  previousSalary: number | null;
  newSalary: number | null;
  remarks: string | null;
  approvedByUserId: string | null;
  createdAt: string | Date;
}

export interface EmployeeDetailData {
  id: string;
  userId: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | Date | null;
  gender: string | null;
  joinDate: string | Date;
  confirmationDate: string | Date | null;
  status: string;
  employmentType: string;
  baseSalary: number;
  bankName: string | null;
  bankAccount: string | null;
  emergencyContact: string | null;
  createdAt: string | Date;
  company: {
    id: string;
    name: string;
    currency: string;
  };
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
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  transitions: TransitionHistoryItem[];
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

interface EmployeeDetailProps {
  employee: EmployeeDetailData;
  branches: BranchOption[];
  departments: DepartmentOption[];
  designations: DesignationOption[];
}

export function EmployeeDetail({
  employee,
  branches,
  departments,
  designations,
}: EmployeeDetailProps) {
  const router = useRouter();

  // Modal State
  const [isTransitionOpen, setIsTransitionOpen] = React.useState(false);
  const [transitionType, setTransitionType] = React.useState("PROMOTION");
  const [effectiveDate, setEffectiveDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [toBranchId, setToBranchId] = React.useState(employee.branch.id);
  const [toDepartmentId, setToDepartmentId] = React.useState(
    employee.department.id
  );
  const [toDesignationId, setToDesignationId] = React.useState(
    employee.designation.id
  );
  const [newSalary, setNewSalary] = React.useState(
    (employee.baseSalary / 100).toFixed(2)
  );
  const [remarks, setRemarks] = React.useState("");

  // Status message
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Departments for selected target branch
  const targetBranchDepts = departments.filter(
    (d) => d.branchId === toBranchId
  );

  // Helper map for branch names
  const branchMap = React.useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  // Helper map for department names
  const departmentMap = React.useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Helper map for designation titles
  const designationMap = React.useMemo(() => {
    const map = new Map<string, string>();
    designations.forEach((d) => map.set(d.id, d.title));
    return map;
  }, [designations]);

  function openTransitionModal() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTransitionType("PROMOTION");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setToBranchId(employee.branch.id);
    setToDepartmentId(employee.department.id);
    setToDesignationId(employee.designation.id);
    setNewSalary((employee.baseSalary / 100).toFixed(2));
    setRemarks("");
    setIsTransitionOpen(true);
  }

  async function handleRecordTransition(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const salaryNumber = Math.round(parseFloat(newSalary) * 100);

    const res = await recordEmployeeTransitionAction({
      employeeId: employee.id,
      transitionType: transitionType as
        | "HIRED"
        | "PROMOTION"
        | "TRANSFER"
        | "DEPARTMENT_CHANGE"
        | "SALARY_ADJUSTMENT"
        | "SUSPENSION"
        | "RESIGNATION"
        | "TERMINATION",
      effectiveDate,
      toBranchId: toBranchId !== employee.branch.id ? toBranchId : undefined,
      toDepartmentId:
        toDepartmentId !== employee.department.id ? toDepartmentId : undefined,
      toDesignationId:
        toDesignationId !== employee.designation.id
          ? toDesignationId
          : undefined,
      newSalary:
        !isNaN(salaryNumber) && salaryNumber !== employee.baseSalary
          ? salaryNumber
          : undefined,
      remarks: remarks.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to record transition");
      return;
    }

    setSuccessMsg("Career transition logged and employee record updated");
    setIsTransitionOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-2 -ml-2 gap-1.5"
          >
            <Link href="/hr">
              <ArrowLeft className="h-4 w-4" />
              Back to Staff Directory
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant="outline" className="font-mono">
                  {employee.employeeNumber}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {employee.designation.title} • {employee.department.name} •{" "}
                {employee.branch.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={
                employee.status === "ACTIVE"
                  ? "default"
                  : employee.status === "PROBATION"
                    ? "outline"
                    : "destructive"
              }
              className="text-sm capitalize"
            >
              {employee.status.toLowerCase()}
            </Badge>
            <Button onClick={openTransitionModal} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Record Transition
            </Button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Base Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              $
              {(employee.baseSalary / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              Monthly compensation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Branch Location
            </CardTitle>
            <Building2 className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{employee.branch.name}</div>
            <p className="text-muted-foreground text-xs">
              Code: {employee.branch.code}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Assigned Shift
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {employee.shift ? employee.shift.name : "Unassigned"}
            </div>
            <p className="text-muted-foreground text-xs">
              {employee.shift
                ? `${employee.shift.startTime} – ${employee.shift.endTime}`
                : "Standard branch roster"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Date of Joining
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {new Date(employee.joinDate).toLocaleDateString()}
            </div>
            <p className="text-muted-foreground text-xs">
              Type: {employee.employmentType.replace("_", " ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Profile & Career Timeline */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <History className="h-4 w-4" />
            Career Timeline ({employee.transitions.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            Personal & Banking
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Career Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-primary h-5 w-5" />
                Career & Lifecycle History
              </CardTitle>
              <CardDescription>
                Audited timeline of promotions, branch transfers, and salary
                revisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employee.transitions.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  No transition events recorded for this employee.
                </div>
              ) : (
                <div className="border-border relative ml-4 space-y-8 border-l pl-6">
                  {employee.transitions.map((item) => {
                    const toBranchName = item.toBranchId
                      ? branchMap.get(item.toBranchId) || item.toBranchId
                      : null;
                    const fromBranchName = item.fromBranchId
                      ? branchMap.get(item.fromBranchId) || item.fromBranchId
                      : null;
                    const toDeptName = item.toDepartmentId
                      ? departmentMap.get(item.toDepartmentId) ||
                        item.toDepartmentId
                      : null;
                    const toDesigTitle = item.toDesignationId
                      ? designationMap.get(item.toDesignationId) ||
                        item.toDesignationId
                      : null;

                    return (
                      <div key={item.id} className="relative">
                        {/* Dot on line */}
                        <div className="bg-primary ring-background absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full ring-4" />

                        <div className="bg-card space-y-3 rounded-lg border p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  item.transitionType === "HIRED"
                                    ? "default"
                                    : item.transitionType === "PROMOTION"
                                      ? "secondary"
                                      : item.transitionType === "TRANSFER"
                                        ? "outline"
                                        : "secondary"
                                }
                              >
                                {item.transitionType.replace("_", " ")}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {toDesigTitle || employee.designation.title}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              Effective:{" "}
                              {new Date(
                                item.effectiveDate
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Event Details Grid */}
                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            {item.newSalary !== null && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 shrink-0 text-emerald-500" />
                                <span>
                                  Salary:{" "}
                                  <strong className="font-mono">
                                    $
                                    {(item.newSalary / 100).toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </strong>
                                  {item.previousSalary !== null &&
                                    item.previousSalary !== item.newSalary && (
                                      <span className="text-muted-foreground ml-1 text-xs">
                                        (was $
                                        {(
                                          item.previousSalary / 100
                                        ).toLocaleString()}
                                        )
                                      </span>
                                    )}
                                </span>
                              </div>
                            )}

                            {toBranchName && (
                              <div className="flex items-center gap-2">
                                <Building2 className="text-primary h-4 w-4 shrink-0" />
                                <span>
                                  Branch: <strong>{toBranchName}</strong>
                                  {fromBranchName &&
                                    fromBranchName !== toBranchName && (
                                      <span className="text-muted-foreground ml-1 text-xs">
                                        (from {fromBranchName})
                                      </span>
                                    )}
                                </span>
                              </div>
                            )}

                            {toDeptName && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="text-muted-foreground h-4 w-4 shrink-0" />
                                <span>
                                  Department: <strong>{toDeptName}</strong>
                                </span>
                              </div>
                            )}
                          </div>

                          {item.remarks && (
                            <p className="bg-muted/50 text-muted-foreground rounded p-2 text-xs italic">
                              &ldquo;{item.remarks}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Personal & Banking Details */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="text-primary h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Email Address</span>
                  <span className="font-medium">{employee.email}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">
                    {employee.phone || "Not recorded"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">
                    {employee.dateOfBirth
                      ? new Date(employee.dateOfBirth).toLocaleDateString()
                      : "Not recorded"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Emergency Contact
                  </span>
                  <span className="font-medium">
                    {employee.emergencyContact || "Not recorded"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    ERP User Account
                  </span>
                  <span className="font-medium">
                    {employee.user ? (
                      <Badge variant="secondary">{employee.user.email}</Badge>
                    ) : (
                      "No user account linked"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="text-primary h-4 w-4" />
                  Banking & Disbursement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Disbursement Method
                  </span>
                  <span className="font-medium">Direct Bank Deposit</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Bank Name</span>
                  <span className="font-medium">
                    {employee.bankName || "Pending Setup"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono font-medium">
                    {employee.bankAccount || "Pending Setup"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    Default Currency
                  </span>
                  <span className="font-medium">
                    {employee.company.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Status</span>
                  <span className="font-medium">Standard Withholding</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Transition Modal Dialog */}
      <Dialog open={isTransitionOpen} onOpenChange={setIsTransitionOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <form onSubmit={handleRecordTransition}>
            <DialogHeader>
              <DialogTitle>Record Career Transition</DialogTitle>
              <DialogDescription>
                Log promotion, transfer, reassignment, or compensation change
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="trans-type">Transition Event</Label>
                <Select
                  value={transitionType}
                  onValueChange={setTransitionType}
                >
                  <SelectTrigger id="trans-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROMOTION">Promotion</SelectItem>
                    <SelectItem value="TRANSFER">Branch Transfer</SelectItem>
                    <SelectItem value="DEPARTMENT_CHANGE">
                      Department Reassignment
                    </SelectItem>
                    <SelectItem value="SALARY_ADJUSTMENT">
                      Salary Revision
                    </SelectItem>
                    <SelectItem value="SUSPENSION">Suspension</SelectItem>
                    <SelectItem value="RESIGNATION">Resignation</SelectItem>
                    <SelectItem value="TERMINATION">Termination</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="trans-date">Effective Date</Label>
                <Input
                  id="trans-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="trans-branch">Target Branch</Label>
                <Select
                  value={toBranchId}
                  onValueChange={(val) => {
                    setToBranchId(val);
                    const depts = departments.filter((d) => d.branchId === val);
                    if (depts.length > 0) {
                      setToDepartmentId(depts[0].id);
                    }
                  }}
                >
                  <SelectTrigger id="trans-branch">
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
                <Label htmlFor="trans-dept">Target Department</Label>
                <Select
                  value={toDepartmentId}
                  onValueChange={setToDepartmentId}
                >
                  <SelectTrigger id="trans-dept">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetBranchDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="trans-desig">Designation</Label>
                <Select
                  value={toDesignationId}
                  onValueChange={setToDesignationId}
                >
                  <SelectTrigger id="trans-desig">
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
                <Label htmlFor="trans-salary">New Monthly Salary ($)</Label>
                <Input
                  id="trans-salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="trans-remarks">Remarks / Justification</Label>
                <Input
                  id="trans-remarks"
                  placeholder="e.g. Annual performance review promotion"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransitionOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Transition"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
