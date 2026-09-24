"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  Building2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createShiftAction,
  updateShiftAction,
  deleteShiftAction,
} from "@/actions/hr-actions";

export interface ShiftItem {
  id: string;
  branchId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    employees: number;
  };
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface ShiftManagerProps {
  shifts: ShiftItem[];
  branches: BranchOption[];
  defaultBranchId?: string;
}

export function ShiftManager({
  shifts: initialShifts,
  branches,
  defaultBranchId,
}: ShiftManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] =
    React.useState<string>("ALL");
  const [shifts, setShifts] = React.useState<ShiftItem[]>(initialShifts);

  React.useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createBranchId, setCreateBranchId] = React.useState(
    defaultBranchId || branches[0]?.id || ""
  );
  const [createName, setCreateName] = React.useState("");
  const [createCode, setCreateCode] = React.useState("");
  const [createStartTime, setCreateStartTime] = React.useState("09:00");
  const [createEndTime, setCreateEndTime] = React.useState("17:00");
  const [createGraceMinutes, setCreateGraceMinutes] = React.useState(15);

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingShift, setEditingShift] = React.useState<ShiftItem | null>(
    null
  );
  const [editName, setEditName] = React.useState("");
  const [editCode, setEditCode] = React.useState("");
  const [editStartTime, setEditStartTime] = React.useState("");
  const [editEndTime, setEditEndTime] = React.useState("");
  const [editGraceMinutes, setEditGraceMinutes] = React.useState(15);

  // Delete Dialog state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Status message state
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.branch.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch =
      selectedBranchFilter === "ALL" || s.branchId === selectedBranchFilter;

    return matchesSearch && matchesBranch;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createShiftAction({
      branchId: createBranchId,
      name: createName,
      code: createCode.toUpperCase().trim(),
      startTime: createStartTime,
      endTime: createEndTime,
      gracePeriodMinutes: createGraceMinutes,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to create work shift");
      return;
    }

    setSuccessMsg(`Shift '${createName}' created successfully`);
    setIsCreateOpen(false);
    setCreateName("");
    setCreateCode("");
    setCreateStartTime("09:00");
    setCreateEndTime("17:00");
    setCreateGraceMinutes(15);
    router.refresh();
  }

  function openEdit(s: ShiftItem) {
    setEditingShift(s);
    setEditName(s.name);
    setEditCode(s.code);
    setEditStartTime(s.startTime);
    setEditEndTime(s.endTime);
    setEditGraceMinutes(s.gracePeriodMinutes);
    setErrorMsg(null);
    setIsEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingShift) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateShiftAction({
      id: editingShift.id,
      name: editName,
      code: editCode.toUpperCase().trim(),
      startTime: editStartTime,
      endTime: editEndTime,
      gracePeriodMinutes: editGraceMinutes,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update work shift");
      return;
    }

    setSuccessMsg(`Shift '${editName}' updated successfully`);
    setIsEditOpen(false);
    setEditingShift(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deletingId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteShiftAction(deletingId);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to delete work shift");
      setIsDeleteOpen(false);
      return;
    }

    setSuccessMsg("Shift deleted successfully");
    setIsDeleteOpen(false);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Shifts</h1>
          <p className="text-muted-foreground text-sm">
            Configure working hours, rosters, and attendance grace windows
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMsg(null);
            setIsCreateOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Work Shift
        </Button>
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

      {/* Shift Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="text-primary h-5 w-5" />
                Shift Schedules
              </CardTitle>
              <CardDescription>
                Roster timings with branch scope and employee assignments
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <Select
                  value={selectedBranchFilter}
                  onValueChange={setSelectedBranchFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by branch" />
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
              <div className="relative w-full max-w-xs sm:w-64">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
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
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Active Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground h-28 text-center"
                    >
                      No shifts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {s.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{s.branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {s.startTime} – {s.endTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {s.gracePeriodMinutes} mins
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{s._count.employees}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
                            title="Edit Shift"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(s.id);
                              setIsDeleteOpen(true);
                            }}
                            disabled={s._count.employees > 0}
                            title={
                              s._count.employees > 0
                                ? "Cannot delete shift with active employees"
                                : "Delete Shift"
                            }
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Create Modal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add New Shift</DialogTitle>
              <DialogDescription>
                Define operational shift timings for a branch
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-branch">Branch</Label>
                <Select
                  value={createBranchId}
                  onValueChange={setCreateBranchId}
                >
                  <SelectTrigger id="create-branch">
                    <SelectValue placeholder="Select branch" />
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
                <Label htmlFor="create-shift-name">Shift Name</Label>
                <Input
                  id="create-shift-name"
                  placeholder="e.g. Regular Day Shift"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-shift-code">Shift Code</Label>
                <Input
                  id="create-shift-code"
                  placeholder="e.g. DAY-01"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-start">Start Time</Label>
                  <Input
                    id="create-start"
                    type="time"
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-end">End Time</Label>
                  <Input
                    id="create-end"
                    type="time"
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-grace">Grace Period (Minutes)</Label>
                <Input
                  id="create-grace"
                  type="number"
                  min="0"
                  max="120"
                  value={createGraceMinutes}
                  onChange={(e) =>
                    setCreateGraceMinutes(parseInt(e.target.value, 10) || 0)
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Shift</DialogTitle>
              <DialogDescription>
                Modify schedule timings and grace period
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-shift-name">Shift Name</Label>
                <Input
                  id="edit-shift-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-shift-code">Shift Code</Label>
                <Input
                  id="edit-shift-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Start Time</Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end">End Time</Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-grace">Grace Period (Minutes)</Label>
                <Input
                  id="edit-grace"
                  type="number"
                  min="0"
                  max="120"
                  value={editGraceMinutes}
                  onChange={(e) =>
                    setEditGraceMinutes(parseInt(e.target.value, 10) || 0)
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
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
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift? It will be archived
              and will no longer be selectable for employee assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
