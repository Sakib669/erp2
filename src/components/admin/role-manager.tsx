"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit2, Trash2, Shield, Users } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
} from "@/actions/rbac-actions";

export interface PermissionRecord {
  id: string;
  name: string;
  code: string;
  module: string;
  description: string | null;
}

export interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: {
    permissionId: string;
    permission: PermissionRecord;
  }[];
}

interface RoleManagerProps {
  roles: RoleRecord[];
  allPermissions: PermissionRecord[];
}

export function RoleManager({ roles, allPermissions }: RoleManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createCode, setCreateCode] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createSelectedPerms, setCreateSelectedPerms] = React.useState<
    string[]
  >([]);

  // Edit Modal State
  const [editingRole, setEditingRole] = React.useState<RoleRecord | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editSelectedPerms, setEditSelectedPerms] = React.useState<string[]>(
    []
  );

  // Group permissions by module
  const permissionsByModule = React.useMemo(() => {
    const map = new Map<string, PermissionRecord[]>();
    for (const p of allPermissions) {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [allPermissions]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createCode) {
      toast.error("Role name and code are required");
      return;
    }
    if (createSelectedPerms.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    startTransition(async () => {
      const res = await createRoleAction({
        name: createName,
        code: createCode.toUpperCase().trim(),
        description: createDescription.trim() || undefined,
        permissionIds: createSelectedPerms,
      });

      if (res.success) {
        toast.success(`Role ${createName} created successfully`);
        setIsCreateOpen(false);
        setCreateName("");
        setCreateCode("");
        setCreateDescription("");
        setCreateSelectedPerms([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create role");
      }
    });
  };

  const openEditModal = (role: RoleRecord) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditDescription(role.description || "");
    setEditSelectedPerms(role.permissions.map((p) => p.permissionId));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (editSelectedPerms.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    startTransition(async () => {
      const res = await updateRoleAction(editingRole.id, {
        name: editingRole.isSystem ? undefined : editName,
        description: editDescription.trim() || undefined,
        permissionIds: editSelectedPerms,
      });

      if (res.success) {
        toast.success(`Role ${editingRole.name} updated successfully`);
        setEditingRole(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update role");
      }
    });
  };

  const handleDelete = (role: RoleRecord) => {
    startTransition(async () => {
      const res = await deleteRoleAction(role.id);
      if (res.success) {
        toast.success(`Role ${role.name} deleted successfully`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete role");
      }
    });
  };

  const toggleCreatePerm = (permId: string) => {
    setCreateSelectedPerms((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const toggleEditPerm = (permId: string) => {
    setEditSelectedPerms((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const toggleModuleCreate = (moduleName: string) => {
    const modulePerms = permissionsByModule.get(moduleName) || [];
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) =>
      createSelectedPerms.includes(id)
    );

    if (allSelected) {
      setCreateSelectedPerms((prev) =>
        prev.filter((id) => !modulePermIds.includes(id))
      );
    } else {
      setCreateSelectedPerms((prev) =>
        Array.from(new Set([...prev, ...modulePermIds]))
      );
    }
  };

  const toggleModuleEdit = (moduleName: string) => {
    const modulePerms = permissionsByModule.get(moduleName) || [];
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) =>
      editSelectedPerms.includes(id)
    );

    if (allSelected) {
      setEditSelectedPerms((prev) =>
        prev.filter((id) => !modulePermIds.includes(id))
      );
    } else {
      setEditSelectedPerms((prev) =>
        Array.from(new Set([...prev, ...modulePermIds]))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b">
        <Link
          href="/admin/users"
          className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-4 py-2 text-sm font-medium"
        >
          Staff Directory
        </Link>
        <Link
          href="/admin/roles"
          className="border-primary text-foreground border-b-2 px-4 py-2 text-sm font-medium"
        >
          Roles & Permissions
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Roles and Permissions
          </h2>
          <p className="text-muted-foreground text-xs">
            Configure system roles and assemble fine grained permission matrices
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              New Custom Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
                <DialogDescription>
                  Define a new role and choose authorized functional permissions
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-foreground text-xs font-medium">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inventory Clerk"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-foreground text-xs font-medium">
                      Role Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INVENTORY_CLERK"
                      value={createCode}
                      onChange={(e) =>
                        setCreateCode(e.target.value.toUpperCase())
                      }
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 font-mono text-xs outline-none focus:ring-1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground text-xs font-medium">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the operational responsibilities of this role"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                  />
                </div>

                {/* Permission Matrix */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-1">
                    <label className="text-foreground text-xs font-semibold">
                      Permission Matrix ({createSelectedPerms.length} selected)
                    </label>
                    <span className="text-muted-foreground text-[10px]">
                      Click module name to toggle all
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Array.from(permissionsByModule.entries()).map(
                      ([moduleName, perms]) => {
                        const allSelected = perms.every((p) =>
                          createSelectedPerms.includes(p.id)
                        );
                        return (
                          <div
                            key={moduleName}
                            className="bg-muted/20 rounded-md border p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => toggleModuleCreate(moduleName)}
                                className="text-primary text-left text-xs font-semibold tracking-wider uppercase hover:underline"
                              >
                                {moduleName} Module ({perms.length})
                              </button>
                              <Badge
                                variant={allSelected ? "default" : "outline"}
                                className="text-[10px]"
                              >
                                {allSelected ? "All Selected" : "Partial"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {perms.map((perm) => {
                                const isChecked = createSelectedPerms.includes(
                                  perm.id
                                );
                                return (
                                  <label
                                    key={perm.id}
                                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded p-1.5 text-xs"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() =>
                                        toggleCreatePerm(perm.id)
                                      }
                                      className="mt-0.5"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-foreground font-medium">
                                        {perm.name}
                                      </span>
                                      <span className="text-muted-foreground font-mono text-[10px]">
                                        {perm.code}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles List Table */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-xs font-medium">
              Configured Roles ({roles.length})
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Role</TableHead>
                <TableHead className="w-[160px]">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Permissions</TableHead>
                <TableHead className="w-[100px]">Staff</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="text-primary size-4 shrink-0" />
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary text-[10px]"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {role.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[280px] truncate text-xs">
                    {role.description || "No description provided"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary" className="text-[10px]">
                      {role.permissions.length} perms
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      <span>{role.userCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Edit Role"
                        onClick={() => openEditModal(role)}
                        disabled={isPending}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      {!role.isSystem && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive size-7"
                              title="Delete Role"
                              disabled={isPending || role.userCount > 0}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete role &quot;
                                {role.name}&quot;? This role will be soft
                                deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(role)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {editingRole && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>
                  Edit Role: {editingRole.name}
                  {editingRole.isSystem && " (System Role)"}
                </DialogTitle>
                <DialogDescription>
                  {editingRole.isSystem
                    ? "System role names are immutable. You may adjust description and permission assignments."
                    : "Update role details and authorized functional permissions."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-foreground text-xs font-medium">
                      Role Name
                    </label>
                    <input
                      type="text"
                      disabled={editingRole.isSystem}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-foreground text-xs font-medium">
                      Role Code
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingRole.code}
                      className="border-input bg-muted w-full rounded-md border px-3 py-1.5 font-mono text-xs opacity-70 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground text-xs font-medium">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                  />
                </div>

                {/* Permission Matrix */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-1">
                    <label className="text-foreground text-xs font-semibold">
                      Permission Matrix ({editSelectedPerms.length} selected)
                    </label>
                    <span className="text-muted-foreground text-[10px]">
                      Click module name to toggle all
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Array.from(permissionsByModule.entries()).map(
                      ([moduleName, perms]) => {
                        const allSelected = perms.every((p) =>
                          editSelectedPerms.includes(p.id)
                        );
                        return (
                          <div
                            key={moduleName}
                            className="bg-muted/20 rounded-md border p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => toggleModuleEdit(moduleName)}
                                className="text-primary text-left text-xs font-semibold tracking-wider uppercase hover:underline"
                              >
                                {moduleName} Module ({perms.length})
                              </button>
                              <Badge
                                variant={allSelected ? "default" : "outline"}
                                className="text-[10px]"
                              >
                                {allSelected ? "All Selected" : "Partial"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {perms.map((perm) => {
                                const isChecked = editSelectedPerms.includes(
                                  perm.id
                                );
                                return (
                                  <label
                                    key={perm.id}
                                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded p-1.5 text-xs"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() =>
                                        toggleEditPerm(perm.id)
                                      }
                                      className="mt-0.5"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-foreground font-medium">
                                        {perm.name}
                                      </span>
                                      <span className="text-muted-foreground font-mono text-[10px]">
                                        {perm.code}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRole(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
