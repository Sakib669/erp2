"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  Eye,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Building,
  Trash2,
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
  createJournalEntryAction,
  postJournalEntryAction,
  getJournalEntryDetailsAction,
} from "@/actions/account-actions";

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface JournalEntryItem {
  id: string;
  companyId: string;
  branchId: string;
  entryNumber: string;
  entryDate: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  description: string;
  reference: string | null;
  totalAmount: number;
  postedAt: string | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    lines: number;
  };
}

export interface JournalLineItem {
  id: string;
  accountId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  memo: string | null;
  account: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

export interface JournalDetailData {
  id: string;
  entryNumber: string;
  entryDate: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  description: string;
  reference: string | null;
  totalAmount: number;
  postedAt: string | null;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  lines: JournalLineItem[];
}

interface JournalLedgerProps {
  entries: JournalEntryItem[];
  branches: BranchOption[];
  accounts: AccountOption[];
  currentBranchId?: string;
  isAccountsAdmin?: boolean;
}

interface NewLineState {
  accountId: string;
  type: "DEBIT" | "CREDIT";
  amountInput: string;
  memo: string;
}

export function JournalLedger({
  entries: initialEntries,
  branches,
  accounts,
  currentBranchId,
  isAccountsAdmin = false,
}: JournalLedgerProps) {
  const router = useRouter();
  const [entries, setEntries] =
    React.useState<JournalEntryItem[]>(initialEntries);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string>(
    currentBranchId || "ALL"
  );
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [viewingEntry, setViewingEntry] =
    React.useState<JournalDetailData | null>(null);
  const [postingId, setPostingId] = React.useState<string | null>(null);

  // Form states for creation
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(
    currentBranchId || branches[0]?.id || ""
  );
  const [entryDate, setEntryDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [formLines, setFormLines] = React.useState<NewLineState[]>([
    {
      accountId: accounts[0]?.id || "",
      type: "DEBIT",
      amountInput: "",
      memo: "",
    },
    {
      accountId: accounts[1]?.id || accounts[0]?.id || "",
      type: "CREDIT",
      amountInput: "",
      memo: "",
    },
  ]);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const resetForm = () => {
    setSelectedBranchId(currentBranchId || branches[0]?.id || "");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setDescription("");
    setFormLines([
      {
        accountId: accounts[0]?.id || "",
        type: "DEBIT",
        amountInput: "",
        memo: "",
      },
      {
        accountId: accounts[1]?.id || accounts[0]?.id || "",
        type: "CREDIT",
        amountInput: "",
        memo: "",
      },
    ]);
    setErrorMessage(null);
  };

  const addLine = () => {
    setFormLines((prev) => [
      ...prev,
      {
        accountId: accounts[0]?.id || "",
        type: "DEBIT",
        amountInput: "",
        memo: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (formLines.length <= 2) return;
    setFormLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (
    index: number,
    field: keyof NewLineState,
    value: string
  ) => {
    setFormLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Calculate live debit/credit totals in cents
  const totalDebitsCents = formLines
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => {
      const val = Math.round((parseFloat(l.amountInput) || 0) * 100);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const totalCreditsCents = formLines
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => {
      const val = Math.round((parseFloat(l.amountInput) || 0) * 100);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const differenceCents = totalDebitsCents - totalCreditsCents;
  const isBalanced =
    totalDebitsCents > 0 &&
    totalCreditsCents > 0 &&
    totalDebitsCents === totalCreditsCents;

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isBalanced) {
      setErrorMessage(
        "Journal voucher must be balanced: total debits must equal total credits"
      );
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Description is required");
      return;
    }

    setLoading(true);

    try {
      const parsedLines = formLines.map((l) => ({
        accountId: l.accountId,
        type: l.type,
        amount: Math.round(parseFloat(l.amountInput) * 100),
        memo: l.memo.trim() || undefined,
      }));

      const res = await createJournalEntryAction({
        branchId: selectedBranchId,
        entryDate,
        description: description.trim(),
        reference: reference.trim() || undefined,
        lines: parsedLines,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create journal voucher");
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

  const handlePostEntry = async (id: string) => {
    setPostingId(id);
    setErrorMessage(null);

    try {
      const res = await postJournalEntryAction({ id });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to post journal entry");
        return;
      }

      if (viewingEntry && viewingEntry.id === id) {
        setViewingEntry({
          ...viewingEntry,
          status: "POSTED",
          postedAt: new Date().toISOString(),
        });
      }
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred while posting");
    } finally {
      setPostingId(null);
    }
  };

  const handleOpenView = async (entryId: string) => {
    const res = await getJournalEntryDetailsAction(entryId);
    if (res.success && res.entry) {
      setViewingEntry({
        id: res.entry.id,
        entryNumber: res.entry.entryNumber,
        entryDate: new Date(res.entry.entryDate).toISOString(),
        status: res.entry.status as "DRAFT" | "POSTED" | "CANCELLED",
        description: res.entry.description,
        reference: res.entry.reference,
        totalAmount: res.entry.totalAmount,
        postedAt: res.entry.postedAt
          ? new Date(res.entry.postedAt).toISOString()
          : null,
        branch: res.entry.branch,
        lines: res.entry.lines.map((l) => ({
          id: l.id,
          accountId: l.accountId,
          type: l.type as "DEBIT" | "CREDIT",
          amount: l.amount,
          memo: l.memo,
          account: l.account,
        })),
      });
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      entry.entryNumber.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      (entry.reference && entry.reference.toLowerCase().includes(q));

    const matchesBranch =
      branchFilter === "ALL" || entry.branchId === branchFilter;

    const matchesStatus =
      statusFilter === "ALL" || entry.status === statusFilter;

    return matchesSearch && matchesBranch && matchesStatus;
  });

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
              <FileText className="text-primary h-6 w-6" />
              Journal Vouchers
            </h1>
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            Double entry vouchers, general ledger postings, and audit trails
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/accounts/periods">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Fiscal Periods
            </Button>
          </Link>
          {isAccountsAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Journal Voucher
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search voucher number or memo..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
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

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft Only</SelectItem>
                  <SelectItem value="POSTED">Posted to Ledger</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Vouchers Register</CardTitle>
          <CardDescription>
            Chronological records of financial transactions and posting statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">
                    Debit / Credit Total
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No journal vouchers found matching filter criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {entry.entryNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building className="h-3.5 w-3.5" />
                          {entry.branch.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground line-clamp-1 font-medium">
                          {entry.description}
                        </div>
                        {entry.reference && (
                          <div className="text-muted-foreground text-xs">
                            Ref: {entry.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            entry.status === "POSTED"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : entry.status === "DRAFT"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {entry._count.lines} lines
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        $
                        {(entry.totalAmount / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenView(entry.id)}
                            title="View Voucher Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {entry.status === "DRAFT" && isAccountsAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => handlePostEntry(entry.id)}
                              disabled={postingId === entry.id}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {postingId === entry.id ? "Posting..." : "Post"}
                            </Button>
                          )}
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

      {/* Create Voucher Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
          <form onSubmit={handleCreateVoucher}>
            <DialogHeader>
              <DialogTitle>New Journal Voucher</DialogTitle>
              <DialogDescription>
                Create a balanced double entry general ledger voucher
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive my-2 flex items-center gap-2 rounded p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={setSelectedBranchId}
                  >
                    <SelectTrigger>
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

                <div className="space-y-1.5">
                  <Label htmlFor="create-entry-date">Posting Date</Label>
                  <Input
                    id="create-entry-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-ref">Reference Code</Label>
                  <Input
                    id="create-ref"
                    placeholder="e.g. INV-2026-99"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-desc">Description / Memo</Label>
                <Input
                  id="create-desc"
                  placeholder="e.g. Office rent payment for October"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Dynamic Line Rows */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Ledger Lines</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line
                  </Button>
                </div>

                <div className="divide-y overflow-hidden rounded border">
                  {formLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/20 grid grid-cols-1 items-center gap-2 p-3 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-5">
                        <Select
                          value={line.accountId}
                          onValueChange={(val) =>
                            updateLine(idx, "accountId", val)
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.code} - {a.name} ({a.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2">
                        <Select
                          value={line.type}
                          onValueChange={(val: "DEBIT" | "CREDIT") =>
                            updateLine(idx, "type", val)
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">Debit</SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          className="font-mono text-xs"
                          value={line.amountInput}
                          onChange={(e) =>
                            updateLine(idx, "amountInput", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Line memo"
                          className="text-xs"
                          value={line.memo}
                          onChange={(e) =>
                            updateLine(idx, "memo", e.target.value)
                          }
                        />
                      </div>

                      <div className="text-right sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => removeLine(idx)}
                          disabled={formLines.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance validation bar */}
                <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-muted-foreground mr-1">
                        Total Debits:
                      </span>
                      <span className="text-foreground font-mono font-bold">
                        ${(totalDebitsCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">
                        Total Credits:
                      </span>
                      <span className="text-foreground font-mono font-bold">
                        ${(totalCreditsCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">
                        Difference:
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          differenceCents === 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        ${(Math.abs(differenceCents) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isBalanced ? (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                        Balanced Voucher
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Unbalanced: Debits must equal Credits
                      </Badge>
                    )}
                  </div>
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
              <Button type="submit" disabled={loading || !isBalanced}>
                {loading ? "Saving Voucher..." : "Create Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Voucher Details Dialog */}
      <Dialog
        open={Boolean(viewingEntry)}
        onOpenChange={(open) => !open && setViewingEntry(null)}
      >
        <DialogContent className="sm:max-w-[700px]">
          {viewingEntry && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                    <span>Voucher {viewingEntry.entryNumber}</span>
                    <Badge
                      variant="secondary"
                      className={
                        viewingEntry.status === "POSTED"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          : viewingEntry.status === "DRAFT"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                            : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                      }
                    >
                      {viewingEntry.status}
                    </Badge>
                  </DialogTitle>
                </div>
                <DialogDescription>
                  Recorded on{" "}
                  {new Date(viewingEntry.entryDate).toLocaleDateString()} for{" "}
                  {viewingEntry.branch.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-muted/30 rounded p-3 text-sm">
                  <div className="text-foreground font-semibold">
                    {viewingEntry.description}
                  </div>
                  {viewingEntry.reference && (
                    <div className="text-muted-foreground mt-1 text-xs">
                      Reference: {viewingEntry.reference}
                    </div>
                  )}
                  {viewingEntry.postedAt && (
                    <div className="mt-1 text-xs text-emerald-600">
                      Posted to general ledger on{" "}
                      {new Date(viewingEntry.postedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Memo</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingEntry.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <span className="mr-1.5 font-mono text-xs font-semibold">
                              {l.account.code}
                            </span>
                            <span>{l.account.name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {l.memo || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {l.type === "DEBIT"
                              ? `$${(l.amount / 100).toFixed(2)}`
                              : ""}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {l.type === "CREDIT"
                              ? `$${(l.amount / 100).toFixed(2)}`
                              : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between px-2 text-sm font-semibold">
                  <span>Total Transaction Amount:</span>
                  <span className="font-mono text-base">
                    $
                    {(viewingEntry.totalAmount / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <DialogFooter>
                {viewingEntry.status === "DRAFT" && isAccountsAdmin && (
                  <Button
                    onClick={() => handlePostEntry(viewingEntry.id)}
                    disabled={postingId === viewingEntry.id}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {postingId === viewingEntry.id
                      ? "Posting..."
                      : "Post to Ledger"}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewingEntry(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
