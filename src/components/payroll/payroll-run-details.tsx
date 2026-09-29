"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertCircle,
  CreditCard,
  Building,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { markPayslipsPaidAction } from "@/actions/payroll-actions";

export interface PayslipItemRow {
  id: string;
  name: string;
  code: string;
  type: string; // EARNING, DEDUCTION
  amount: number;
}

export interface PayslipRow {
  id: string;
  payrollRunId: string;
  employeeId: string;
  branchId: string;
  year: number;
  month: number;
  baseSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  paidDays: number;
  unpaidLeaveDays: number;
  prorationRatio: number;
  status: string;
  paymentDate: string | Date | null;
  paymentMethod: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    email: string;
    department: {
      id: string;
      name: string;
    };
    designation: {
      id: string;
      title: string;
    };
  };
  items: PayslipItemRow[];
}

export interface PayrollRunDetailsData {
  id: string;
  companyId: string;
  branchId: string;
  year: number;
  month: number;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  notes: string | null;
  processedAt: string | Date | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  payslips: PayslipRow[];
}

interface PayrollRunDetailsProps {
  run: PayrollRunDetailsData;
  isPayrollAdmin?: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PayrollRunDetails({
  run,
  isPayrollAdmin = false,
}: PayrollRunDetailsProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("ALL");

  // Selected payslip modal
  const [viewingPayslip, setViewingPayslip] = React.useState<PayslipRow | null>(
    null
  );

  // Mark paid modal
  const [isMarkPaidOpen, setIsMarkPaidOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<
    "BANK_TRANSFER" | "CASH" | "CHEQUE"
  >("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const departments = Array.from(
    new Set(run.payslips.map((p) => p.employee.department.name))
  );

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await markPayslipsPaidAction({
        runId: run.id,
        paymentMethod,
        paymentDate,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update payment status");
        setLoading(false);
        return;
      }

      setIsMarkPaidOpen(false);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayslips = run.payslips.filter((p) => {
    const q = searchTerm.toLowerCase();
    const fullName =
      `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(q) ||
      p.employee.employeeNumber.toLowerCase().includes(q) ||
      p.employee.email.toLowerCase().includes(q);
    const matchesDept =
      departmentFilter === "ALL" ||
      p.employee.department.name === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const allPaid =
    run.payslips.length > 0 && run.payslips.every((p) => p.status === "PAID");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/payroll"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payroll Runs
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="text-primary h-6 w-6" />
            {MONTH_NAMES[run.month - 1]} {run.year} Payroll
          </h1>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
            <Building className="h-3.5 w-3.5" />
            Branch: {run.branch.name} ({run.branch.code})
            {run.notes && <span>• Notes: {run.notes}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {run.status === "COMPLETED" && (
            <Badge
              variant="secondary"
              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            >
              Completed Cycle
            </Badge>
          )}

          {isPayrollAdmin && run.status === "COMPLETED" && !allPaid && (
            <Button onClick={() => setIsMarkPaidOpen(true)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Disburse & Mark as Paid
            </Button>
          )}

          {allPaid && (
            <Badge
              variant="secondary"
              className="border-emerald-500/20 bg-emerald-500/10 py-1 text-xs text-emerald-600"
            >
              Disbursed in Full
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Payroll</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(run.totalGross / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Base wages plus all allowances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deductions
            </CardTitle>
            <AlertCircle className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">
              $
              {(run.totalDeductions / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Absences, taxes, and withholding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Payable</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">
              $
              {(run.totalNet / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Actual total disbursement amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Staff Enrolled
            </CardTitle>
            <FileText className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{run.employeeCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Individual payslips produced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search staff by name or employee number..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Payslip Roster</CardTitle>
          <CardDescription>
            Itemized compensation records for the selected calendar cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department / Title</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-center">
                    Days / Proration
                  </TableHead>
                  <TableHead className="text-right">Gross Earnings</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Take Home</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Breakdown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No payslips found matching search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayslips.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="text-foreground font-semibold">
                          {p.employee.firstName} {p.employee.lastName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {p.employee.employeeNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">
                          {p.employee.department.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {p.employee.designation.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        $
                        {(p.baseSalary / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs font-medium">
                          {p.paidDays} / {p.workingDays} paid
                        </div>
                        {p.prorationRatio < 1.0 ? (
                          <Badge
                            variant="secondary"
                            className="mt-0.5 border-amber-500/20 bg-amber-500/10 py-0 text-[10px] text-amber-600"
                          >
                            Prorated {Math.round(p.prorationRatio * 100)}%
                          </Badge>
                        ) : p.unpaidLeaveDays > 0 ? (
                          <div className="text-destructive text-[10px]">
                            {p.unpaidLeaveDays} unpaid day(s)
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-[10px]">
                            Full Month
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground text-right font-medium">
                        $
                        {(p.grossEarnings / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-destructive text-right text-sm">
                        $
                        {(p.totalDeductions / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        $
                        {(p.netSalary / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        {p.status === "PAID" ? (
                          <Badge
                            variant="secondary"
                            className="border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-600"
                          >
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Approved
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingPayslip(p)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Payslip Details Dialog */}
      <Dialog
        open={Boolean(viewingPayslip)}
        onOpenChange={(open) => !open && setViewingPayslip(null)}
      >
        <DialogContent className="sm:max-w-[540px]">
          {viewingPayslip && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Itemized Employee Payslip</span>
                  {viewingPayslip.status === "PAID" && (
                    <Badge
                      variant="secondary"
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    >
                      Disbursed
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Period: {MONTH_NAMES[viewingPayslip.month - 1]}{" "}
                  {viewingPayslip.year} • {run.branch.name}
                </DialogDescription>
              </DialogHeader>

              {/* Employee Summary Card */}
              <div className="bg-muted/40 my-4 space-y-1 rounded-lg border p-3 text-sm">
                <div className="text-foreground text-base font-semibold">
                  {viewingPayslip.employee.firstName}{" "}
                  {viewingPayslip.employee.lastName}
                </div>
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>Number: {viewingPayslip.employee.employeeNumber}</span>
                  <span>Dept: {viewingPayslip.employee.department.name}</span>
                </div>
                <div className="text-muted-foreground flex justify-between pt-1 text-xs">
                  <span>
                    Title: {viewingPayslip.employee.designation.title}
                  </span>
                  <span>
                    Days: {viewingPayslip.paidDays} /{" "}
                    {viewingPayslip.workingDays}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-4">
                {/* Earnings List */}
                <div>
                  <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Earnings Line Items
                  </h4>
                  <div className="space-y-1 divide-y rounded-md border p-2 text-sm">
                    {viewingPayslip.items
                      .filter((i) => i.type === "EARNING")
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between py-1.5 first:pt-0 last:pb-0"
                        >
                          <span className="text-foreground">{item.name}</span>
                          <span className="font-mono font-medium">
                            $
                            {(item.amount / 100).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    <div className="flex justify-between pt-2 font-semibold text-emerald-600">
                      <span>Total Gross Earnings</span>
                      <span className="font-mono">
                        $
                        {(viewingPayslip.grossEarnings / 100).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions List */}
                <div>
                  <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                    Deductions & Withholding
                  </h4>
                  <div className="space-y-1 divide-y rounded-md border p-2 text-sm">
                    {viewingPayslip.items.filter((i) => i.type === "DEDUCTION")
                      .length === 0 ? (
                      <div className="text-muted-foreground py-1 text-xs">
                        No deductions applied
                      </div>
                    ) : (
                      viewingPayslip.items
                        .filter((i) => i.type === "DEDUCTION")
                        .map((item) => (
                          <div
                            key={item.id}
                            className="text-destructive flex justify-between py-1.5 first:pt-0 last:pb-0"
                          >
                            <span>{item.name}</span>
                            <span className="font-mono font-medium">
                              -$
                              {(item.amount / 100).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ))
                    )}
                    <div className="text-destructive flex justify-between pt-2 font-semibold">
                      <span>Total Deductions</span>
                      <span className="font-mono">
                        -$
                        {(viewingPayslip.totalDeductions / 100).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Total Box */}
                <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border p-3">
                  <span className="text-foreground font-bold">
                    Net Payable Salary
                  </span>
                  <span className="text-primary font-mono text-xl font-bold">
                    $
                    {(viewingPayslip.netSalary / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setViewingPayslip(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleMarkPaid}>
            <DialogHeader>
              <DialogTitle>Disburse & Mark as Paid</DialogTitle>
              <DialogDescription>
                Record banking or cash disbursement for this payroll cycle
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive my-2 flex items-center gap-2 rounded p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Disbursement Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: "BANK_TRANSFER" | "CASH" | "CHEQUE") =>
                    setPaymentMethod(val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">
                      Bank Wire Transfer
                    </SelectItem>
                    <SelectItem value="CASH">Cash Payment</SelectItem>
                    <SelectItem value="CHEQUE">Corporate Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Value Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMarkPaidOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Confirm Disbursement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
