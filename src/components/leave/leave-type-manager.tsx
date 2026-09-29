"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Settings,
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
  createLeaveTypeAction,
  updateLeaveTypeAction,
  deleteLeaveTypeAction,
} from "@/actions/leave-actions";

export interface LeaveTypeRow {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description: string | null;
  defaultDaysPerYear: number;
  isPaid: boolean;
  requiresApproval: boolean;
  carryForwardMaxDays: number;
  _count?: {
    leaveBalances: number;
    leaveRequests: number;
  };
}

interface LeaveTypeManagerProps {
  companyId: string;
  leaveTypes: LeaveTypeRow[];
  isHrAdmin?: boolean;
}

export function LeaveTypeManager({
  companyId,
  leaveTypes: initialLeaveTypes,
  isHrAdmin = false,
}: LeaveTypeManagerProps) {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] =
    React.useState<LeaveTypeRow[]>(initialLeaveTypes);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<LeaveTypeRow | null>(
    null
  );
  const [deletingType, setDeletingType] = React.useState<LeaveTypeRow | null>(
    null
  );

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [defaultDays, setDefaultDays] = React.useState("14");
  const [carryForwardDays, setCarryForwardDays] = React.useState("0");
  const [isPaid, setIsPaid] = React.useState(true);
  const [requiresApproval, setRequiresApproval] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLeaveTypes(initialLeaveTypes);
  }, [initialLeaveTypes]);

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setDefaultDays("14");
    setCarryForwardDays("0");
    setIsPaid(true);
    setRequiresApproval(true);
    setErrorMessage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (item: LeaveTypeRow) => {
    setEditingType(item);
    setName(item.name);
    setCode(item.code);
    setDescription(item.description || "");
    setDefaultDays(item.defaultDaysPerYear.toString());
    setCarryForwardDays(item.carryForwardMaxDays.toString());
    setIsPaid(item.isPaid);
    setRequiresApproval(item.requiresApproval);
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await createLeaveTypeAction({
        companyId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        defaultDaysPerYear: parseInt(defaultDays, 10) || 0,
        carryForwardMaxDays: parseInt(carryForwardDays, 10) || 0,
        isPaid,
        requiresApproval,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create leave policy category");
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
    if (!editingType) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await updateLeaveTypeAction({
        id: editingType.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        defaultDaysPerYear: parseInt(defaultDays, 10) || 0,
        carryForwardMaxDays: parseInt(carryForwardDays, 10) || 0,
        isPaid,
        requiresApproval,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update leave policy category");
        setLoading(false);
        return;
      }

      setEditingType(null);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await deleteLeaveTypeAction(deletingType.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete leave policy category");
        setLoading(false);
        return;
      }

      setDeletingType(null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = leaveTypes.filter((lt) => {
    const q = searchTerm.toLowerCase();
    return (
      lt.name.toLowerCase().includes(q) ||
      lt.code.toLowerCase().includes(q) ||
      (lt.description && lt.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/leave"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Leave Requests
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Settings className="text-primary h-6 w-6" />
            Leave Policy Categories
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure company leave types annual entitlements and carry over
            rules
          </p>
        </div>

        {isHrAdmin && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Leave Category
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search by category name or code..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-muted-foreground text-xs">
              Total Categories: {filteredTypes.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Leave Types</CardTitle>
          <CardDescription>
            Annual allowance and approval rules applied to employee leave
            balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Annual Allowance</TableHead>
                  <TableHead className="text-right">Max Carry Over</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead className="text-right">Usage Records</TableHead>
                  {isHrAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isHrAdmin ? 8 : 7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No leave categories found matching criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="text-foreground font-semibold">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-muted-foreground line-clamp-1 text-xs">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {item.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.defaultDaysPerYear} days
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.carryForwardMaxDays} days
                      </TableCell>
                      <TableCell>
                        {item.isPaid ? (
                          <Badge
                            variant="secondary"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          >
                            Paid Leave
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="border-zinc-500/20 bg-zinc-500/10 text-zinc-600"
                          >
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.requiresApproval ? (
                          <span className="text-xs font-medium text-amber-600">
                            Manager Approval
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-medium">
                            Auto Approved
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {item._count?.leaveBalances ?? 0} balances
                      </TableCell>
                      {isHrAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                              title="Edit Leave Category"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setErrorMessage(null);
                                setDeletingType(item);
                              }}
                              title="Delete Leave Category"
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
              <DialogTitle>Add Leave Category</DialogTitle>
              <DialogDescription>
                Define a new company leave type policy and entitlement quotas
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
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g. Annual Vacation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-code">Code</Label>
                  <Input
                    id="create-code"
                    placeholder="e.g. AL"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-description">Description</Label>
                <Input
                  id="create-description"
                  placeholder="Optional policy details or eligibility description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-default-days">
                    Annual Quota (Days)
                  </Label>
                  <Input
                    id="create-default-days"
                    type="number"
                    min="0"
                    max="365"
                    value={defaultDays}
                    onChange={(e) => setDefaultDays(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-carry-days">
                    Carry Over Cap (Days)
                  </Label>
                  <Input
                    id="create-carry-days"
                    type="number"
                    min="0"
                    max="365"
                    value={carryForwardDays}
                    onChange={(e) => setCarryForwardDays(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Paid Leave</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Requires Approval</span>
                </label>
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
                {loading ? "Saving..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingType)}
        onOpenChange={(open) => !open && setEditingType(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Leave Category</DialogTitle>
              <DialogDescription>
                Modify leave allowance and approval workflow configuration
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
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-default-days">Annual Quota (Days)</Label>
                  <Input
                    id="edit-default-days"
                    type="number"
                    min="0"
                    max="365"
                    value={defaultDays}
                    onChange={(e) => setDefaultDays(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-carry-days">Carry Over Cap (Days)</Label>
                  <Input
                    id="edit-carry-days"
                    type="number"
                    min="0"
                    max="365"
                    value={carryForwardDays}
                    onChange={(e) => setCarryForwardDays(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Paid Leave</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Requires Approval</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingType(null)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingType)}
        onOpenChange={(open) => !open && setDeletingType(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Leave Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingType?.name}? Categories
              with recorded employee balances cannot be removed.
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
              onClick={() => setDeletingType(null)}
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
