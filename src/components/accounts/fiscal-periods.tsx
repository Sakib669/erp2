"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Lock,
  Unlock,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  FileText,
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
import { Badge } from "@/components/ui/badge";
import {
  createFiscalPeriodAction,
  toggleFiscalPeriodLockAction,
} from "@/actions/account-actions";

export interface FiscalPeriodItem {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
}

interface FiscalPeriodsProps {
  companyId: string;
  periods: FiscalPeriodItem[];
  isAccountsAdmin?: boolean;
}

export function FiscalPeriods({
  companyId,
  periods: initialPeriods,
  isAccountsAdmin = false,
}: FiscalPeriodsProps) {
  const router = useRouter();
  const [periods, setPeriods] =
    React.useState<FiscalPeriodItem[]>(initialPeriods);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPeriods(initialPeriods);
  }, [initialPeriods]);

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await createFiscalPeriodAction({
        companyId,
        name: name.trim(),
        startDate,
        endDate,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create fiscal period");
        setLoading(false);
        return;
      }

      setIsCreateOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (period: FiscalPeriodItem) => {
    setTogglingId(period.id);
    setErrorMessage(null);

    try {
      const res = await toggleFiscalPeriodLockAction({
        id: period.id,
        isClosed: !period.isClosed,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update period lock status");
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/accounts">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Calendar className="text-primary h-6 w-6" />
              Fiscal Periods
            </h1>
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            Accounting cycles, period closing locks, and backdated posting
            guards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/accounts">
            <Button variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Chart of Accounts
            </Button>
          </Link>
          <Link href="/accounts/journals">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Journal Vouchers
            </Button>
          </Link>
          {isAccountsAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Fiscal Period
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Fiscal Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounting Periods Register</CardTitle>
          <CardDescription>
            Locked periods reject creation and posting of general ledger journal
            vouchers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lock Details</TableHead>
                  {isAccountsAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAccountsAdmin ? 6 : 5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No fiscal periods configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-foreground font-semibold">
                        {p.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(p.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(p.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            p.isClosed
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-600"
                              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          }
                        >
                          {p.isClosed ? (
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Unlock className="h-3 w-3" /> Open
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.isClosed && p.closedAt
                          ? `Locked on ${new Date(p.closedAt).toLocaleDateString()}`
                          : "Active for posting"}
                      </TableCell>
                      {isAccountsAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleLock(p)}
                            disabled={togglingId === p.id}
                            className={
                              p.isClosed
                                ? "gap-1.5 text-xs text-emerald-600 hover:text-emerald-700"
                                : "gap-1.5 text-xs text-rose-600 hover:text-rose-700"
                            }
                          >
                            {p.isClosed ? (
                              <>
                                <Unlock className="h-3.5 w-3.5" />
                                {togglingId === p.id
                                  ? "Unlocking..."
                                  : "Unlock Period"}
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5" />
                                {togglingId === p.id
                                  ? "Locking..."
                                  : "Lock Period"}
                              </>
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Fiscal Period</DialogTitle>
              <DialogDescription>
                Define an accounting cycle with bounded start and end dates
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
                <Label htmlFor="create-name">Period Name</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. FY2026-Q1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-start-date">Start Date</Label>
                  <Input
                    id="create-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-end-date">End Date</Label>
                  <Input
                    id="create-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
