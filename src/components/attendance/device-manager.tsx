"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  ArrowLeft,
  Search,
  AlertCircle,
  CheckCircle2,
  Check,
  Building2,
  Send,
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
import { ingestRawPunchesAction } from "@/actions/attendance-actions";

export interface RawAttendanceLogItem {
  id: string;
  branchId: string;
  deviceId: string;
  employeeNumber: string;
  punchTime: string | Date;
  punchType: string;
  processed: boolean;
  processingError: string | null;
  createdAt: string | Date;
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

interface DeviceManagerProps {
  logs: RawAttendanceLogItem[];
  branches: BranchOption[];
  currentBranchId?: string;
}

export function DeviceManager({
  logs: initialLogs,
  branches,
  currentBranchId,
}: DeviceManagerProps) {
  const router = useRouter();
  const [logs, setLogs] = React.useState<RawAttendanceLogItem[]>(initialLogs);

  React.useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  // Filters
  const [selectedBranch, setSelectedBranch] = React.useState<string>(
    currentBranchId || "ALL"
  );
  const [searchTerm, setSearchTerm] = React.useState("");

  // Test Punch Ingestion Modal
  const [isTestOpen, setIsTestOpen] = React.useState(false);
  const [testBranchId, setTestBranchId] = React.useState(
    currentBranchId || branches[0]?.id || ""
  );
  const [testDeviceId, setTestDeviceId] = React.useState("ZK-GATE-01");
  const [testEmpNumber, setTestEmpNumber] = React.useState("EMP-1001");
  const [testPunchType, setTestPunchType] = React.useState("CHECK_IN");
  const [testTime, setTestTime] = React.useState("08:55");

  // Notifications
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const filteredLogs = logs.filter((l) => {
    const matchesBranch =
      selectedBranch === "ALL" || l.branchId === selectedBranch;
    const matchesSearch =
      l.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.branch.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesBranch && matchesSearch;
  });

  async function handleSimulatePunch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const punchIso = new Date(`${todayStr}T${testTime}:00.000Z`).toISOString();

    const res = await ingestRawPunchesAction({
      branchId: testBranchId,
      deviceId: testDeviceId.trim(),
      punches: [
        {
          employeeNumber: testEmpNumber.trim(),
          punchTime: punchIso,
          punchType: testPunchType as "CHECK_IN" | "CHECK_OUT" | "AUTO",
        },
      ],
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to ingest biometric punch");
      return;
    }

    setSuccessMsg(
      `Biometric punch ingested: ${res.insertedCount} recorded, ${res.duplicatesSkipped} duplicates skipped`
    );
    setIsTestOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-2 -ml-2 gap-1.5"
          >
            <Link href="/attendance">
              <ArrowLeft className="h-4 w-4" />
              Back to Attendance Dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Biometric Hardware & Ingestion Stream
            </h1>
            <p className="text-muted-foreground text-sm">
              Real-time punch stream from physical access scanners with
              duplicate rejection
            </p>
          </div>
          <Button
            onClick={() => {
              setErrorMsg(null);
              setIsTestOpen(true);
            }}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Simulate Punch Ingestion
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

      {/* Device Log Stream Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="text-primary h-5 w-5" />
              <div>
                <CardTitle>Biometric Punch Stream</CardTitle>
                <CardDescription>
                  Recent clock events across all physical terminals
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
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

              <div className="relative w-full sm:w-56">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search device or staff..."
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
                  <TableHead>Punch Time (UTC)</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Punch Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No biometric punch events recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.punchTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{log.branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.deviceId}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {log.employeeNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.punchType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.processed ? (
                          <Badge
                            variant="default"
                            className="gap-1 bg-emerald-600 text-xs hover:bg-emerald-600"
                          >
                            <Check className="h-3 w-3" />
                            Processed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-500"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Simulate Punch Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSimulatePunch}>
            <DialogHeader>
              <DialogTitle>Simulate Biometric Ingestion</DialogTitle>
              <DialogDescription>
                Trigger a test punch payload as if transmitted by a physical
                scanner
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sim-branch">Branch</Label>
                <Select value={testBranchId} onValueChange={setTestBranchId}>
                  <SelectTrigger id="sim-branch">
                    <SelectValue />
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
                <Label htmlFor="sim-dev">Device ID</Label>
                <Input
                  id="sim-dev"
                  value={testDeviceId}
                  onChange={(e) => setTestDeviceId(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sim-emp">Employee Number</Label>
                <Input
                  id="sim-emp"
                  value={testEmpNumber}
                  onChange={(e) => setTestEmpNumber(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sim-type">Punch Type</Label>
                  <Select
                    value={testPunchType}
                    onValueChange={setTestPunchType}
                  >
                    <SelectTrigger id="sim-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECK_IN">Check In</SelectItem>
                      <SelectItem value="CHECK_OUT">Check Out</SelectItem>
                      <SelectItem value="AUTO">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sim-time">Time</Label>
                  <Input
                    id="sim-time"
                    type="time"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTestOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Transmitting..." : "Send Test Punch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
