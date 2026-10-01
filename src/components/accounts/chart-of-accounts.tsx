"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
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
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
} from "@/actions/account-actions";

export interface AccountItem {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  currency: string;
  balance: number;
  description: string | null;
  parentId: string | null;
  parent?: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count?: {
    journalLines: number;
  };
}

interface ChartOfAccountsProps {
  companyId: string;
  accounts: AccountItem[];
  isAccountsAdmin?: boolean;
}

export function ChartOfAccounts({
  companyId,
  accounts: initialAccounts,
  isAccountsAdmin = false,
}: ChartOfAccountsProps) {
  const router = useRouter();
  const [accounts, setAccounts] =
    React.useState<AccountItem[]>(initialAccounts);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] =
    React.useState<AccountItem | null>(null);
  const [deletingAccount, setDeletingAccount] =
    React.useState<AccountItem | null>(null);

  // Form states
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<
    "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  >("ASSET");
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("NONE");

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  const resetForm = () => {
    setCode("");
    setName("");
    setType("ASSET");
    setDescription("");
    setParentId("NONE");
    setErrorMessage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (account: AccountItem) => {
    setEditingAccount(account);
    setCode(account.code);
    setName(account.name);
    setType(
      account.type as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
    );
    setDescription(account.description || "");
    setParentId(account.parentId || "NONE");
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await createAccountAction({
        companyId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        parentId: parentId === "NONE" ? undefined : parentId,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create account");
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await updateAccountAction({
        id: editingAccount.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        parentId: parentId === "NONE" ? undefined : parentId,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update account");
        setLoading(false);
        return;
      }

      setEditingAccount(null);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await deleteAccountAction(deletingAccount.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete account");
        setLoading(false);
        return;
      }

      setDeletingAccount(null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      acc.name.toLowerCase().includes(q) ||
      acc.code.toLowerCase().includes(q) ||
      (acc.description && acc.description.toLowerCase().includes(q));
    const matchesType = typeFilter === "ALL" || acc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate totals by account category
  const totalAssets = accounts
    .filter((a) => a.type === "ASSET")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.type === "LIABILITY")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalEquity = accounts
    .filter((a) => a.type === "EQUITY")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalRevenue = accounts
    .filter((a) => a.type === "REVENUE")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalExpenses = accounts
    .filter((a) => a.type === "EXPENSE")
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="text-primary h-6 w-6" />
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground text-sm">
            Hierarchical general ledger accounts and real time trial balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/accounts/journals">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Journal Vouchers
            </Button>
          </Link>
          <Link href="/accounts/periods">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Fiscal Periods
            </Button>
          </Link>
          {isAccountsAdmin && (
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              $
              {(totalAssets / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-amber-600 uppercase">
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              $
              {(totalLiabilities / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-sky-600 uppercase">
              Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              $
              {(totalEquity / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              $
              {(totalRevenue / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-rose-600 uppercase">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              $
              {(totalExpenses / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search accounts by name or code..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="ASSET">Assets</SelectItem>
                  <SelectItem value="LIABILITY">Liabilities</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts Register</CardTitle>
          <CardDescription>
            Configured ledger accounts and real time posted balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent Account</TableHead>
                  <TableHead className="text-right">Postings</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  {isAccountsAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAccountsAdmin ? 7 : 6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No accounts found matching search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {acc.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground font-semibold">
                          {acc.name}
                        </div>
                        {acc.description && (
                          <div className="text-muted-foreground line-clamp-1 text-xs">
                            {acc.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            acc.type === "ASSET"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : acc.type === "LIABILITY"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : acc.type === "EQUITY"
                                  ? "border-sky-500/20 bg-sky-500/10 text-sky-600"
                                  : acc.type === "REVENUE"
                                    ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                                    : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                          }
                        >
                          {acc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {acc.parent ? (
                          <span className="flex items-center gap-1">
                            <Layers className="text-muted-foreground h-3.5 w-3.5" />
                            {acc.parent.name} ({acc.parent.code})
                          </span>
                        ) : (
                          "Top Level"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {acc._count?.journalLines ?? 0} lines
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        $
                        {(acc.balance / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      {isAccountsAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(acc)}
                              title="Edit Account"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setErrorMessage(null);
                                setDeletingAccount(acc);
                              }}
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
              <DialogDescription>
                Define a new general ledger account in the chart of accounts
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive my-2 flex items-center gap-2 rounded p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-code">Account Code</Label>
                  <Input
                    id="create-code"
                    placeholder="e.g. 1010"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={type}
                    onValueChange={(
                      val:
                        "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
                    ) => setType(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="REVENUE">Revenue</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-name">Account Name</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Operating Checking Account"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Parent Account (Optional)</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None (Top Level)</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-desc">Description</Label>
                <Input
                  id="create-desc"
                  placeholder="Optional account description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                {loading ? "Saving..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingAccount)}
        onOpenChange={(open) => !open && setEditingAccount(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Modify general ledger account details
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive my-2 flex items-center gap-2 rounded p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-code">Account Code</Label>
                  <Input
                    id="edit-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={type}
                    onValueChange={(
                      val:
                        "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
                    ) => setType(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="REVENUE">Revenue</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Account Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Parent Account (Optional)</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None (Top Level)</SelectItem>
                    {accounts
                      .filter((a) => a.id !== editingAccount?.id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Description</Label>
                <Input
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAccount(null)}
                disabled={loading}
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

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deletingAccount)}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingAccount?.name}? Accounts
              with posted journal records cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingAccount(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
