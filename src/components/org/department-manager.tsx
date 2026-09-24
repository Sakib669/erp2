"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, FolderTree, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "@/actions/org-actions";

export interface DepartmentNode {
  id: string;
  branchId: string;
  parentId: string | null;
  name: string;
  code: string;
  children?: DepartmentNode[];
  createdAt: Date;
}

interface DepartmentManagerProps {
  branchId: string;
  branchName: string;
  departments: DepartmentNode[];
}

export function DepartmentManager({
  branchId,
  branchName,
  departments,
}: DepartmentManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editDept, setEditDept] = React.useState<DepartmentNode | null>(null);
  const [deleteDeptId, setDeleteDeptId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [parentId, setParentId] = React.useState<string | undefined>(undefined);

  const resetForm = () => {
    setName("");
    setCode("");
    setParentId(undefined);
  };

  // Build hierarchical tree
  const rootDepartments = departments.filter((d) => !d.parentId);
  const getChildren = (pid: string) =>
    departments.filter((d) => d.parentId === pid);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createDepartmentAction({
        branchId,
        parentId: parentId && parentId !== "none" ? parentId : null,
        name,
        code: code.toUpperCase(),
      });

      if (res.success) {
        toast.success(`Department ${name} created`);
        setCreateOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create department");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;

    startTransition(async () => {
      const res = await updateDepartmentAction(editDept.id, {
        name,
        code: code.toUpperCase(),
        parentId: parentId && parentId !== "none" ? parentId : null,
      });

      if (res.success) {
        toast.success(`Department ${name} updated`);
        setEditDept(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update department");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteDeptId) return;

    startTransition(async () => {
      const res = await deleteDepartmentAction(deleteDeptId);
      if (res.success) {
        toast.success("Department soft deleted");
        setDeleteDeptId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete department");
      }
    });
  };

  const openEditModal = (dept: DepartmentNode) => {
    setEditDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setParentId(dept.parentId || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            Departments in {branchName} ({departments.length})
          </h2>
          <p className="text-muted-foreground text-xs">
            Hierarchical organizational units and operational reporting trees.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 text-xs">
              <Plus className="size-4" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>
                  Add a functional unit to the active branch hierarchy.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-4 text-xs">
                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="dept-name" className="text-right">
                    Name *
                  </Label>
                  <Input
                    id="dept-name"
                    required
                    placeholder="e.g. Engineering"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="dept-code" className="text-right">
                    Code *
                  </Label>
                  <Input
                    id="dept-code"
                    required
                    placeholder="e.g. ENG"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="col-span-3 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="dept-parent" className="text-right">
                    Parent Unit
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={parentId || "none"}
                      onValueChange={(val) =>
                        setParentId(val === "none" ? undefined : val)
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="No Parent (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No Parent (Top Level Unit)
                        </SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Department"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hierarchical Department Trees */}
      <div className="space-y-4">
        {rootDepartments.length === 0 ? (
          <Card className="text-muted-foreground border-dashed p-8 text-center text-xs">
            No departments created in this branch yet. Click &quot;Add
            Department&quot; to establish an organizational structure.
          </Card>
        ) : (
          rootDepartments.map((root) => {
            const children = getChildren(root.id);
            return (
              <Card key={root.id} className="border-border bg-card">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderTree className="text-primary size-4" />
                      <span className="text-foreground text-sm font-bold">
                        {root.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {root.code}
                      </Badge>
                      <Badge className="bg-muted text-muted-foreground text-[10px]">
                        Top-Level
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEditModal(root)}
                        title="Edit Department"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 size-7"
                        onClick={() => setDeleteDeptId(root.id)}
                        title="Delete Department"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  {children.length > 0 ? (
                    <div className="border-border/60 ml-2 space-y-2 border-l-2 pt-2 pl-6">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="bg-muted/40 flex items-center justify-between rounded-md p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight className="text-muted-foreground size-3.5" />
                            <span className="text-foreground font-medium">
                              {child.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {child.code}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openEditModal(child)}
                              title="Edit Department"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 size-7"
                              onClick={() => setDeleteDeptId(child.id)}
                              title="Delete Department"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground pl-4 text-[11px] italic">
                      No sub-units defined under this department.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Department Dialog */}
      <Dialog
        open={!!editDept}
        onOpenChange={(open) => !open && setEditDept(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                Update departmental parameters and parent reporting
                relationship.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-xs">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-dept-name" className="text-right">
                  Name *
                </Label>
                <Input
                  id="edit-dept-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-dept-code" className="text-right">
                  Code *
                </Label>
                <Input
                  id="edit-dept-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="col-span-3 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-dept-parent" className="text-right">
                  Parent Unit
                </Label>
                <div className="col-span-3">
                  <Select
                    value={parentId || "none"}
                    onValueChange={(val) =>
                      setParentId(val === "none" ? undefined : val)
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="No Parent (Top Level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No Parent (Top Level Unit)
                      </SelectItem>
                      {departments
                        .filter((d) => d.id !== editDept?.id)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDept(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDeptId}
        onOpenChange={(open) => !open && setDeleteDeptId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This department will be soft deleted. Historic employee
              assignments and vouchers will be preserved. Departments with
              active sub-units cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
