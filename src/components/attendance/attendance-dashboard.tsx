"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Search,
  AlertCircle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle,
  FileEdit,
  CalendarRange,
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
  manualAttendanceCorrectionAction,
  processRawAttendancePunchesAction,
} from "@/actions/attendance-actions";

export interface AttendanceRecordItem {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalWorkMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  status: string;
  isManualCorrection: boolean;
  correctionReason: string | null;
  employee: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
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
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
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

interface AttendanceDashboardProps {
  records: AttendanceRecordItem[];
  branches: BranchOption[];
  departments: DepartmentOption[];
  currentBranchId?: string;
  currentDate: string;
}

export function AttendanceDashboard({
  records,
  branches,
  departments,
  currentBranchId,
  currentDate,
}: AttendanceDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters
  const [selectedDate, setSelectedDate] = React.useState(currentDate);
  const [selectedBranch, setSelectedBranch] = React.useState(
    currentBranchId || branches[0]?.id || "ALL"
  );
  const [selectedDepartment, setSelectedDepartment] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Notifications & Loaders
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Manual Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = React.useState(false);
  const [adjustingRecord, setAdjustingRecord] =
    React.useState<AttendanceRecordItem | null>(null);
  const [adjustCheckIn, setAdjustCheckIn] = React.useState("");
  const [adjustCheckOut, setAdjustCheckOut] = React.useState("");
  const [adjustStatus, setAdjustStatus] = React.useState("PRESENT");
  const [adjustReason, setAdjustReason] = React.useState("");

  // Filter departments for selected branch
  const branchDepartments = departments.filter(
    (d) => selectedBranch === "ALL" || d.branchId === selectedBranch
  );

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("date", newDate);
    if (selectedBranch !== "ALL") {
      params.set("branchId", selectedBranch);
    }
    router.push(`/attendance?${params.toString()}`);
  }

  function handleBranchChange(newBranch: string) {
    setSelectedBranch(newBranch);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("date", selectedDate);
    if (newBranch !== "ALL") {
      params.set("branchId", newBranch);
    } else {
      params.delete("branchId");
    }
    router.push(`/attendance?${params.toString()}`);
  }

  async function handleReprocess() {
    if (selectedBranch === "ALL") {
      setErrorMsg("Please select a specific branch to recalculate attendance");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await processRawAttendancePunchesAction({
      branchId: selectedBranch,
      date: selectedDate,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to process attendance punches");
      return;
    }

    setSuccessMsg(
      `Attendance processed successfully for ${res.processedCount} employee records`
    );
    router.refresh();
  }

  function openAdjustModal(record: AttendanceRecordItem) {
    setAdjustingRecord(record);
    const inVal = record.checkIn
      ? new Date(record.checkIn).toISOString().slice(11, 16)
      : "";
    const outVal = record.checkOut
      ? new Date(record.checkOut).toISOString().slice(11, 16)
      : "";
    setAdjustCheckIn(inVal);
    setAdjustCheckOut(outVal);
    setAdjustStatus(record.status);
    setAdjustReason(record.correctionReason || "");
    setErrorMsg(null);
    setIsAdjustOpen(true);
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingRecord) return;

    if (!adjustReason.trim()) {
      setErrorMsg("A justification reason is required for manual adjustments");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Build ISO dates for check-in and check-out
    let checkInIso: string | undefined = undefined;
    if (adjustCheckIn) {
      checkInIso = new Date(
        `${selectedDate}T${adjustCheckIn}:00.000Z`
      ).toISOString();
    }

    let checkOutIso: string | undefined = undefined;
    if (adjustCheckOut) {
      checkOutIso = new Date(
        `${selectedDate}T${adjustCheckOut}:00.000Z`
      ).toISOString();
    }

    const res = await manualAttendanceCorrectionAction({
      id: adjustingRecord.id,
      checkIn: checkInIso,
      checkOut: checkOutIso,
      status: adjustStatus as
        "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "HOLIDAY",
      reason: adjustReason.trim(),
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to save attendance adjustment");
      return;
    }

    setSuccessMsg(
      `Attendance updated for ${adjustingRecord.employee.firstName} ${adjustingRecord.employee.lastName}`
    );
    setIsAdjustOpen(false);
    setAdjustingRecord(null);
    router.refresh();
  }

  // Filtered rows
  const filteredRecords = records.filter((r) => {
    const matchesDept =
      selectedDepartment === "ALL" ||
      r.employee.department.id === selectedDepartment;
    const matchesStatus =
      selectedStatus === "ALL" || r.status === selectedStatus;
    const matchesSearch =
      r.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.employeeNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesDept && matchesStatus && matchesSearch;
  });

  // Calculate Summary Metrics
  const totalCount = records.length;
  const presentCount = records.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const halfDayCount = records.filter((r) => r.status === "HALF_DAY").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const totalOvertimeMinutes = records.reduce(
    (acc, curr) => acc + (curr.overtimeMinutes || 0),
    0
  );
  const totalOvertimeHours = (totalOvertimeMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground text-sm">
            Monitor daily employee clockings, shift reconciliation, and hours
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/attendance/devices" className="gap-2">
              <Cpu className="h-4 w-4" />
              Device Ingestion Logs
            </Link>
          </Button>
          <Button
            onClick={handleReprocess}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recalculate Day
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

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentCount}</div>
            <p className="text-muted-foreground text-xs">
              {totalCount > 0
                ? `${Math.round((presentCount / totalCount) * 100)}% attendance`
                : "No staff rostered"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lateCount}</div>
            <p className="text-muted-foreground text-xs">
              Arrived past grace period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{halfDayCount}</div>
            <p className="text-muted-foreground text-xs">
              Under 4 hours logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <UserX className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentCount}</div>
            <p className="text-muted-foreground text-xs">No punches recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Overtime Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              {totalOvertimeHours}h
            </div>
            <p className="text-muted-foreground text-xs">
              Total overtime worked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Attendance Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <CalendarRange className="text-primary h-5 w-5" />
              <div>
                <CardTitle>Daily Attendance Ledger</CardTitle>
                <CardDescription>
                  Records for {new Date(selectedDate).toDateString()}
                </CardDescription>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Input */}
              <div className="w-40">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Branch Selector */}
              <div className="w-44">
                <Select
                  value={selectedBranch}
                  onValueChange={handleBranchChange}
                >
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

              {/* Department Selector */}
              <div className="w-40">
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {branchDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Selector */}
              <div className="w-36">
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-52">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search employee..."
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
                  <TableHead>Shift</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Late / Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No attendance records found for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((r) => {
                    const checkInTime = r.checkIn
                      ? new Date(r.checkIn).toTimeString().slice(0, 5)
                      : "—";
                    const checkOutTime = r.checkOut
                      ? new Date(r.checkOut).toTimeString().slice(0, 5)
                      : "—";
                    const hours = Math.floor(r.totalWorkMinutes / 60);
                    const mins = r.totalWorkMinutes % 60;
                    const durationStr =
                      r.totalWorkMinutes > 0 ? `${hours}h ${mins}m` : "—";

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
                          {r.shift ? (
                            <div className="text-xs">
                              <span className="font-medium">
                                {r.shift.name}
                              </span>
                              <div className="text-muted-foreground font-mono">
                                {r.shift.startTime} – {r.shift.endTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Standard
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {checkInTime}
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {checkOutTime}
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {durationStr}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {r.lateMinutes > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                Late {r.lateMinutes}m
                              </span>
                            )}
                            {r.overtimeMinutes > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                OT +{r.overtimeMinutes}m
                              </span>
                            )}
                            {r.lateMinutes === 0 && r.overtimeMinutes === 0 && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                r.status === "PRESENT"
                                  ? "default"
                                  : r.status === "LATE"
                                    ? "outline"
                                    : r.status === "HALF_DAY"
                                      ? "secondary"
                                      : "destructive"
                              }
                              className="text-xs capitalize"
                            >
                              {r.status.toLowerCase().replace("_", " ")}
                            </Badge>
                            {r.isManualCorrection && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground text-[10px]"
                                title={`Adjusted: ${r.correctionReason}`}
                              >
                                Adjusted
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustModal(r)}
                            className="gap-1.5"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                            Adjust
                          </Button>
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

      {/* Manual Correction Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdjustSubmit}>
            <DialogHeader>
              <DialogTitle>Adjust Attendance Record</DialogTitle>
              <DialogDescription>
                Manual supervisor correction for{" "}
                {adjustingRecord?.employee.firstName}{" "}
                {adjustingRecord?.employee.lastName} on {selectedDate}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adjust-in">Check In Time</Label>
                  <Input
                    id="adjust-in"
                    type="time"
                    value={adjustCheckIn}
                    onChange={(e) => setAdjustCheckIn(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adjust-out">Check Out Time</Label>
                  <Input
                    id="adjust-out"
                    type="time"
                    value={adjustCheckOut}
                    onChange={(e) => setAdjustCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adjust-status">Attendance Status</Label>
                <Select value={adjustStatus} onValueChange={setAdjustStatus}>
                  <SelectTrigger id="adjust-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adjust-reason">
                  Justification / Reason (Mandatory)
                </Label>
                <Input
                  id="adjust-reason"
                  placeholder="e.g. Employee forgot to punch RFID card upon entry"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
