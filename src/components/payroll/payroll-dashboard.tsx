"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Plus,
  Eye,
  Settings,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
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
import { executePayrollRunAction } from "@/actions/payroll-actions";

export interface PayrollRunItem {
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
  idempotencyKey: string;
  notes: string | null;
  processedAt: string | Date | null;
  createdAt: string | Date;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    payslips: number;
  };
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface PayrollDashboardProps {
  runs: PayrollRunItem[];
  branches: BranchOption[];
  currentBranchId?: string;
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

export function PayrollDashboard({
  runs: initialRuns,
  branches,
  currentBranchId,
  isPayrollAdmin = false,
}: PayrollDashboardProps) {
  const router = useRouter();
  const [runs, setRuns] = React.useState<PayrollRunItem[]>(initialRuns);
  const [selectedBranch, setSelectedBranch] = React.useState(
    currentBranchId || "ALL"
  );
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear().toString()
  );

  // Dialog states
  const [isExecuteOpen, setIsExecuteOpen] = React.useState(false);
  const [dialogBranchId, setDialogBranchId] = React.useState(
    currentBranchId || (branches[0]?.id ?? "")
  );
  const [dialogYear, setDialogYear] = React.useState(
    new Date().getFullYear().toString()
  );
  const [dialogMonth, setDialogMonth] = React.useState(
    (new Date().getMonth() + 1).toString()
  );
  const [dialogNotes, setDialogNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await executePayrollRunAction({
        branchId: dialogBranchId,
        year: parseInt(dialogYear, 10),
        month: parseInt(dialogMonth, 10),
        notes: dialogNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to process payroll execution");
        setLoading(false);
        return;
      }

      setIsExecuteOpen(false);
      setDialogNotes("");
      router.refresh();
      if (res.payrollRun?.id) {
        router.push(`/payroll/runs/${res.payrollRun.id}`);
      }
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesBranch =
      selectedBranch === "ALL" || run.branchId === selectedBranch;
    const matchesYear = run.year.toString() === selectedYear;
    return matchesBranch && matchesYear;
  });

  // Calculate summary metrics
  const totalNetDisbursed = filteredRuns.reduce(
    (acc, r) => acc + r.totalNet,
    0
  );
  const totalEmployeesCovered = filteredRuns.reduce(
    (acc, r) => acc + r.employeeCount,
    0
  );
  const completedRunsCount = filteredRuns.filter(
    (r) => r.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="text-primary h-6 w-6" />
            Payroll Calculation Engine
          </h1>
          <p className="text-muted-foreground text-sm">
            Execute branch compensation cycles, review payslips, and manage
            allowances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/payroll/components">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Salary Components
            </Button>
          </Link>
          {isPayrollAdmin && (
            <Button onClick={() => setIsExecuteOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Execute Payroll Run
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Payroll Runs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRunsCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Active cycles processed for year {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Net Disbursed
            </CardTitle>
            <DollarSign className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">
              $
              {(totalNetDisbursed / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Net take home across selected cycles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Employees Compensated
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployeesCovered}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Total payslips generated and distributed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[240px]">
              <Select
                value={selectedBranch}
                onValueChange={(val) => setSelectedBranch(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[160px]">
              <Select
                value={selectedYear}
                onValueChange={(val) => setSelectedYear(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground text-xs sm:ml-auto">
              Total Cycles: {filteredRuns.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Execution History</CardTitle>
          <CardDescription>
            Monthly compensation batches and disbursement ledgers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Staff Count</TableHead>
                  <TableHead className="text-right">Total Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Processed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No payroll runs found for selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-semibold">
                        {MONTH_NAMES[run.month - 1]} {run.year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.branch.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {run.status === "COMPLETED" ? (
                          <Badge
                            variant="secondary"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          >
                            Completed
                          </Badge>
                        ) : run.status === "PROCESSING" ? (
                          <Badge
                            variant="secondary"
                            className="border-sky-500/20 bg-sky-500/10 text-sky-600"
                          >
                            Processing
                          </Badge>
                        ) : (
                          <Badge variant="outline">{run.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {run.employeeCount} staff
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        $
                        {(run.totalGross / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-destructive text-right text-sm">
                        $
                        {(run.totalDeductions / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-foreground text-right font-semibold">
                        $
                        {(run.totalNet / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {run.processedAt
                          ? new Date(run.processedAt).toLocaleDateString()
                          : "Not recorded"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/payroll/runs/${run.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1.5">
                            <Eye className="h-4 w-4" />
                            View Payslips
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Execute Run Dialog */}
      <Dialog open={isExecuteOpen} onOpenChange={setIsExecuteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleExecute}>
            <DialogHeader>
              <DialogTitle>Execute Monthly Payroll</DialogTitle>
              <DialogDescription>
                Compute compensation, attendance deductions, and itemized
                payslips
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
                <Label>Target Branch</Label>
                <Select
                  value={dialogBranchId}
                  onValueChange={setDialogBranchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2100"
                    value={dialogYear}
                    onChange={(e) => setDialogYear(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={dialogMonth} onValueChange={setDialogMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={name} value={(idx + 1).toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes or Ledger Reference</Label>
                <Input
                  placeholder="Optional internal cycle reference"
                  value={dialogNotes}
                  onChange={(e) => setDialogNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExecuteOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Calculating..." : "Run Payroll Calculation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
