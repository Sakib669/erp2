"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Settings,
  Calendar,
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
import {
  submitLeaveRequestAction,
  approveLeaveRequestAction,
  rejectLeaveRequestAction,
  cancelLeaveRequestAction,
} from "@/actions/leave-actions";

export interface LeaveRequestItem {
  id: string;
  employeeId: string;
  branchId: string;
  leaveTypeId: string;
  startDate: string | Date;
  endDate: string | Date;
  daysCount: number;
  reason: string;
  status: string;
  approvalNotes: string | null;
  rejectionReason: string | null;
  approvedAt: string | Date | null;
  createdAt: string | Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department: {
      id: string;
      name: string;
    };
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    isPaid: boolean;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  };
}

export interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
  defaultDaysPerYear: number;
  isPaid: boolean;
}

export interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  branchId: string;
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface LeaveDashboardProps {
  requests: LeaveRequestItem[];
  leaveTypes: LeaveTypeOption[];
  employees: EmployeeOption[];
  branches: BranchOption[];
  currentBranchId?: string;
  isHrAdmin?: boolean;
}

export function LeaveDashboard({
  requests: initialRequests,
  leaveTypes,
  employees,
  branches,
  currentBranchId,
  isHrAdmin = false,
}: LeaveDashboardProps) {
  const router = useRouter();
  const [requests, setRequests] =
    React.useState<LeaveRequestItem[]>(initialRequests);

  React.useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string>(
    currentBranchId || "ALL"
  );
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Notifications
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Apply Modal State
  const [isApplyOpen, setIsApplyOpen] = React.useState(false);
  const [applyEmpId, setApplyEmpId] = React.useState(employees[0]?.id || "");
  const [applyTypeId, setApplyTypeId] = React.useState(leaveTypes[0]?.id || "");
  const [applyStartDate, setApplyStartDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [applyEndDate, setApplyEndDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [applyDays, setApplyDays] = React.useState(1);
  const [applyReason, setApplyReason] = React.useState("");

  // Approval Modal State
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = React.useState("");

  // Rejection Modal State
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Calculate day difference when dates change
  React.useEffect(() => {
    if (applyStartDate && applyEndDate) {
      const start = new Date(applyStartDate).getTime();
      const end = new Date(applyEndDate).getTime();
      const diffDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
      setApplyDays(diffDays);
    }
  }, [applyStartDate, applyEndDate]);

  const filteredRequests = requests.filter((r) => {
    const matchesBranch = branchFilter === "ALL" || r.branchId === branchFilter;
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch =
      r.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.employeeNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.leaveType.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesBranch && matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await submitLeaveRequestAction({
      employeeId: applyEmpId,
      leaveTypeId: applyTypeId,
      startDate: applyStartDate,
      endDate: applyEndDate,
      daysCount: applyDays,
      reason: applyReason.trim(),
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to submit leave request");
      return;
    }

    setSuccessMsg("Leave application submitted successfully");
    setIsApplyOpen(false);
    setApplyReason("");
    router.refresh();
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approvingId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await approveLeaveRequestAction({
      id: approvingId,
      approvalNotes: approvalNotes.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to approve leave request");
      return;
    }

    setSuccessMsg("Leave request approved and synced with daily attendance");
    setIsApproveOpen(false);
    setApprovingId(null);
    setApprovalNotes("");
    router.refresh();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;

    if (!rejectionReason.trim()) {
      setErrorMsg("A rejection explanation is mandatory");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await rejectLeaveRequestAction({
      id: rejectingId,
      rejectionReason: rejectionReason.trim(),
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to reject leave request");
      return;
    }

    setSuccessMsg("Leave request rejected and pending balance restored");
    setIsRejectOpen(false);
    setRejectingId(null);
    setRejectionReason("");
    router.refresh();
  }

  async function handleCancel(id: string) {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await cancelLeaveRequestAction(id);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to cancel leave request");
      return;
    }

    setSuccessMsg("Leave request cancelled successfully");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Leave Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage employee time off requests, annual allocations, and approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/leave/types" className="gap-2">
              <Settings className="h-4 w-4" />
              Leave Policies
            </Link>
          </Button>
          <Button
            onClick={() => {
              setErrorMsg(null);
              setIsApplyOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Apply for Leave
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

      {/* KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Requests
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-muted-foreground text-xs">Successfully booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Rejected Leaves
            </CardTitle>
            <UserX className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-muted-foreground text-xs">Declined requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Leave Categories
            </CardTitle>
            <CalendarCheck className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveTypes.length}</div>
            <p className="text-muted-foreground text-xs">
              Active leave policies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-primary h-5 w-5" />
                Time Off Requests
              </CardTitle>
              <CardDescription>
                Employee applications with real-time status and balance updates
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="h-9">
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

              <div className="w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8"
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
                  <TableHead>Category</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((r) => {
                    const startStr = new Date(r.startDate).toLocaleDateString();
                    const endStr = new Date(r.endDate).toLocaleDateString();

                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">
                            {r.employee.firstName} {r.employee.lastName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {r.employee.employeeNumber} •{" "}
                            {r.employee.department.name}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                r.leaveType.isPaid ? "default" : "outline"
                              }
                              className="text-xs"
                            >
                              {r.leaveType.name}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">
                          {startStr} – {endStr}
                        </TableCell>

                        <TableCell className="font-mono text-sm font-semibold">
                          {r.daysCount}d
                        </TableCell>

                        <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
                          {r.reason}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              r.status === "APPROVED"
                                ? "default"
                                : r.status === "PENDING"
                                  ? "outline"
                                  : "destructive"
                            }
                            className="text-xs capitalize"
                          >
                            {r.status.toLowerCase()}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === "PENDING" && isHrAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setApprovingId(r.id);
                                    setIsApproveOpen(true);
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <CheckCircle2 className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRejectingId(r.id);
                                    setIsRejectOpen(true);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {r.status === "PENDING" && !isHrAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(r.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleApply}>
            <DialogHeader>
              <DialogTitle>Apply for Time Off</DialogTitle>
              <DialogDescription>
                Submit an official leave request against your allocated balance
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="apply-emp">Employee</Label>
                <Select value={applyEmpId} onValueChange={setApplyEmpId}>
                  <SelectTrigger id="apply-emp">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="apply-type">Leave Category</Label>
                <Select value={applyTypeId} onValueChange={setApplyTypeId}>
                  <SelectTrigger id="apply-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.defaultDaysPerYear} days/yr,{" "}
                        {t.isPaid ? "Paid" : "Unpaid"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="apply-start">Start Date</Label>
                  <Input
                    id="apply-start"
                    type="date"
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apply-end">End Date</Label>
                  <Input
                    id="apply-end"
                    type="date"
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="apply-days">Days Requested</Label>
                <Input
                  id="apply-days"
                  type="number"
                  min="1"
                  max="180"
                  value={applyDays}
                  onChange={(e) =>
                    setApplyDays(parseInt(e.target.value, 10) || 1)
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="apply-reason">Reason</Label>
                <Input
                  id="apply-reason"
                  placeholder="e.g. Annual family vacation"
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleApprove}>
            <DialogHeader>
              <DialogTitle>Approve Leave Request</DialogTitle>
              <DialogDescription>
                Confirm approval and automatically synchronize attendance
                rosters
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="appr-notes">Approval Notes (Optional)</Label>
                <Input
                  id="appr-notes"
                  placeholder="e.g. Approved per team scheduling arrangements"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApproveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleReject}>
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
              <DialogDescription>
                Document the reason for declining and release locked pending
                days
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rej-reason">
                  Rejection Explanation (Mandatory)
                </Label>
                <Input
                  id="rej-reason"
                  placeholder="e.g. Core team coverage required for milestone delivery"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
