"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
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
import { Badge } from "@/components/ui/badge";
import {
  createDesignationAction,
  updateDesignationAction,
  deleteDesignationAction,
} from "@/actions/hr-actions";

export interface DesignationItem {
  id: string;
  companyId: string;
  title: string;
  code: string;
  description: string | null;
  _count: {
    employees: number;
  };
}

interface DesignationManagerProps {
  designations: DesignationItem[];
  companyId: string;
}

export function DesignationManager({
  designations: initialDesignations,
  companyId,
}: DesignationManagerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [designations, setDesignations] =
    React.useState<DesignationItem[]>(initialDesignations);

  React.useEffect(() => {
    setDesignations(initialDesignations);
  }, [initialDesignations]);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createCode, setCreateCode] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingDesignation, setEditingDesignation] =
    React.useState<DesignationItem | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editCode, setEditCode] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");

  // Delete Dialog state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Status message state
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const filteredDesignations = designations.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description &&
        d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createDesignationAction({
      companyId,
      title: createTitle,
      code: createCode.toUpperCase().trim(),
      description: createDescription.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to create designation");
      return;
    }

    setSuccessMsg(`Designation '${createTitle}' created successfully`);
    setIsCreateOpen(false);
    setCreateTitle("");
    setCreateCode("");
    setCreateDescription("");
    router.refresh();
  }

  function openEdit(d: DesignationItem) {
    setEditingDesignation(d);
    setEditTitle(d.title);
    setEditCode(d.code);
    setEditDescription(d.description || "");
    setErrorMsg(null);
    setIsEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDesignation) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateDesignationAction({
      id: editingDesignation.id,
      title: editTitle,
      code: editCode.toUpperCase().trim(),
      description: editDescription.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update designation");
      return;
    }

    setSuccessMsg(`Designation '${editTitle}' updated successfully`);
    setIsEditOpen(false);
    setEditingDesignation(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deletingId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteDesignationAction(deletingId);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to delete designation");
      setIsDeleteOpen(false);
      return;
    }

    setSuccessMsg("Designation deleted successfully");
    setIsDeleteOpen(false);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Designations</h1>
          <p className="text-muted-foreground text-sm">
            Manage organization job titles, codes, and responsibilities
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
          Add Designation
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

      {/* Designation Directory Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="text-primary h-5 w-5" />
                Company Designations
              </CardTitle>
              <CardDescription>
                Active job titles and current employee counts
              </CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search designations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Active Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDesignations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-28 text-center"
                    >
                      No designations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDesignations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {d.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {d.description || "No description provided"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{d._count.employees}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(d)}
                            title="Edit Designation"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(d.id);
                              setIsDeleteOpen(true);
                            }}
                            disabled={d._count.employees > 0}
                            title={
                              d._count.employees > 0
                                ? "Cannot delete designation with active employees"
                                : "Delete Designation"
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
              <DialogTitle>Add New Designation</DialogTitle>
              <DialogDescription>
                Define a job title and standard code for staffing
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-title">Designation Title</Label>
                <Input
                  id="create-title"
                  placeholder="e.g. Senior Software Engineer"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-code">Designation Code</Label>
                <Input
                  id="create-code"
                  placeholder="e.g. ENG-SR-01"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-desc">Description (Optional)</Label>
                <Input
                  id="create-desc"
                  placeholder="Summary of responsibilities"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
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
                {loading ? "Creating..." : "Create Designation"}
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
              <DialogTitle>Edit Designation</DialogTitle>
              <DialogDescription>
                Update designation title and operational code
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Designation Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Designation Code</Label>
                <Input
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
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
            <AlertDialogTitle>Delete Designation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this designation? This designation
              will be archived and can no longer be assigned to employees.
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
