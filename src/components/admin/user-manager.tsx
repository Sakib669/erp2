"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Shield,
  KeyRound,
  Building2,
  UserCheck,
  UserX,
  Trash2,
  ShieldCheck,
  MoreVertical,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  createUserAction,
  assignUserRoleAction,
  revokeUserRoleAction,
  updateUserStatusAction,
  adminResetPasswordAction,
  updateUserBranchesAction,
} from "@/actions/rbac-actions";

export interface UserRoleRecord {
  id: string;
  roleId: string;
  branchId: string | null;
  role: {
    id: string;
    name: string;
    code: string;
    isSystem: boolean;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface UserBranchRecord {
  id: string;
  branchId: string;
  isDefault: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  };
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  status: string;
  activeBranchId: string | null;
  userRoles: UserRoleRecord[];
  userBranches: UserBranchRecord[];
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export interface RoleOption {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
}

interface UserManagerProps {
  users: UserItem[];
  allRoles: RoleOption[];
  allBranches: BranchOption[];
  currentUserId: string;
}

export function UserManager({
  users,
  allRoles,
  allBranches,
  currentUserId,
}: UserManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // New User Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createSelectedBranches, setCreateSelectedBranches] = React.useState<
    string[]
  >([]);
  const [createDefaultBranch, setCreateDefaultBranch] =
    React.useState<string>("");
  const [createSelectedRoles, setCreateSelectedRoles] = React.useState<
    string[]
  >([]);

  // Assign Role Modal State
  const [roleUser, setRoleUser] = React.useState<UserItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [selectedRoleBranchId, setSelectedRoleBranchId] =
    React.useState<string>("");

  // Manage Branches Modal State
  const [branchUser, setBranchUser] = React.useState<UserItem | null>(null);
  const [userSelectedBranches, setUserSelectedBranches] = React.useState<
    string[]
  >([]);
  const [userDefaultBranch, setUserDefaultBranch] = React.useState<string>("");

  // Reset Password Modal State
  const [passwordUser, setPasswordUser] = React.useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (createSelectedBranches.length === 0) {
      toast.error("Select at least one branch");
      return;
    }
    if (!createDefaultBranch) {
      toast.error("Choose a default branch");
      return;
    }
    if (createSelectedRoles.length === 0) {
      toast.error("Select at least one role");
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        name: createName,
        email: createEmail,
        password: createPassword,
        branchIds: createSelectedBranches,
        defaultBranchId: createDefaultBranch,
        roleIds: createSelectedRoles,
      });

      if (res.success) {
        toast.success(`User ${createName} created successfully`);
        setIsCreateOpen(false);
        setCreateName("");
        setCreateEmail("");
        setCreatePassword("");
        setCreateSelectedBranches([]);
        setCreateDefaultBranch("");
        setCreateSelectedRoles([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create user");
      }
    });
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleUser || !selectedRoleId) {
      toast.error("Please select a role to assign");
      return;
    }

    startTransition(async () => {
      const res = await assignUserRoleAction({
        userId: roleUser.id,
        roleId: selectedRoleId,
        branchId: selectedRoleBranchId ? selectedRoleBranchId : undefined,
      });

      if (res.success) {
        toast.success("Role granted successfully");
        setSelectedRoleId("");
        setSelectedRoleBranchId("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to assign role");
      }
    });
  };

  const handleRevokeRole = async (userRoleId: string) => {
    startTransition(async () => {
      const res = await revokeUserRoleAction(userRoleId);
      if (res.success) {
        toast.success("Role revoked successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to revoke role");
      }
    });
  };

  const openBranchModal = (user: UserItem) => {
    setBranchUser(user);
    const existingBranchIds = user.userBranches.map((ub) => ub.branchId);
    setUserSelectedBranches(existingBranchIds);
    const defaultBranch =
      user.userBranches.find((ub) => ub.isDefault)?.branchId ||
      existingBranchIds[0] ||
      "";
    setUserDefaultBranch(defaultBranch);
  };

  const handleUpdateBranches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchUser) return;
    if (userSelectedBranches.length === 0) {
      toast.error("User must have at least one branch assigned");
      return;
    }
    if (
      !userDefaultBranch ||
      !userSelectedBranches.includes(userDefaultBranch)
    ) {
      toast.error("Default branch must be one of the selected branches");
      return;
    }

    startTransition(async () => {
      const res = await updateUserBranchesAction({
        userId: branchUser.id,
        branchIds: userSelectedBranches,
        defaultBranchId: userDefaultBranch,
      });

      if (res.success) {
        toast.success("Branch assignments updated successfully");
        setBranchUser(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update branches");
      }
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser || !newPassword) return;

    startTransition(async () => {
      const res = await adminResetPasswordAction({
        userId: passwordUser.id,
        newPassword,
      });

      if (res.success) {
        toast.success(`Password for ${passwordUser.name} has been reset`);
        setPasswordUser(null);
        setNewPassword("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reset password");
      }
    });
  };

  const handleToggleStatus = (user: UserItem) => {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      const res = await updateUserStatusAction({
        userId: user.id,
        status: nextStatus,
      });

      if (res.success) {
        toast.success(`User status changed to ${nextStatus}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update user status");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b">
        <Link
          href="/admin/users"
          className="border-primary text-foreground border-b-2 px-4 py-2 text-sm font-medium"
        >
          Staff Directory
        </Link>
        <Link
          href="/admin/roles"
          className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-4 py-2 text-sm font-medium"
        >
          Roles & Permissions
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Staff Directory
          </h2>
          <p className="text-muted-foreground text-xs">
            Manage user accounts, physical branch assignments, and role grants
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              New Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Create an employee account with branch access and role grants
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-4">
                <div className="space-y-1">
                  <label className="text-foreground text-xs font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground text-xs font-medium">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="s.jenkins@acme.corp"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground text-xs font-medium">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                  />
                </div>

                {/* Branch Selection */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-foreground text-xs font-medium">
                    Assigned Branches *
                  </label>
                  <div className="bg-muted/20 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2.5">
                    {allBranches.map((branch) => {
                      const isChecked = createSelectedBranches.includes(
                        branch.id
                      );
                      return (
                        <label
                          key={branch.id}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded p-1 text-xs"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {
                              if (isChecked) {
                                const next = createSelectedBranches.filter(
                                  (id) => id !== branch.id
                                );
                                setCreateSelectedBranches(next);
                                if (createDefaultBranch === branch.id) {
                                  setCreateDefaultBranch(next[0] || "");
                                }
                              } else {
                                const next = [
                                  ...createSelectedBranches,
                                  branch.id,
                                ];
                                setCreateSelectedBranches(next);
                                if (!createDefaultBranch) {
                                  setCreateDefaultBranch(branch.id);
                                }
                              }
                            }}
                          />
                          <span className="truncate">{branch.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {createSelectedBranches.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-foreground text-xs font-medium">
                      Default Branch *
                    </label>
                    <select
                      value={createDefaultBranch}
                      onChange={(e) => setCreateDefaultBranch(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    >
                      {createSelectedBranches.map((bId) => {
                        const branch = allBranches.find((b) => b.id === bId);
                        return (
                          <option key={bId} value={bId}>
                            {branch ? branch.name : bId}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Role Selection */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-foreground text-xs font-medium">
                    Initial Roles *
                  </label>
                  <div className="bg-muted/20 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2.5">
                    {allRoles.map((role) => {
                      const isChecked = createSelectedRoles.includes(role.id);
                      return (
                        <label
                          key={role.id}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded p-1 text-xs"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {
                              if (isChecked) {
                                setCreateSelectedRoles((prev) =>
                                  prev.filter((id) => id !== role.id)
                                );
                              } else {
                                setCreateSelectedRoles((prev) => [
                                  ...prev,
                                  role.id,
                                ]);
                              }
                            }}
                          />
                          <span className="truncate">{role.name}</span>
                        </label>
                      );
                    })}
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
                  {isPending ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="px-4 py-3">
          <span className="text-foreground text-xs font-medium">
            Staff Members ({users.length})
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Staff Member</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead>Assigned Branches</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-foreground text-xs font-semibold">
                        {user.name}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "ACTIVE"
                          ? "default"
                          : user.status === "SUSPENDED"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.length === 0 ? (
                        <span className="text-muted-foreground text-[10px] italic">
                          No roles
                        </span>
                      ) : (
                        user.userRoles.map((ur) => (
                          <Badge
                            key={ur.id}
                            variant="secondary"
                            className="gap-1 px-1.5 py-0 text-[10px]"
                          >
                            <Shield className="text-primary size-2.5" />
                            <span>{ur.role.name}</span>
                            <span className="text-muted-foreground text-[8px]">
                              ({ur.branch ? ur.branch.code : "Global"})
                            </span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.userBranches.length === 0 ? (
                        <span className="text-muted-foreground text-[10px] italic">
                          No branches
                        </span>
                      ) : (
                        user.userBranches.map((ub) => (
                          <Badge
                            key={ub.id}
                            variant="outline"
                            className={`gap-1 px-1.5 py-0 text-[10px] ${
                              ub.isDefault ? "border-primary text-primary" : ""
                            }`}
                          >
                            <Building2 className="size-2.5" />
                            <span>{ub.branch.name}</span>
                            {ub.isDefault && (
                              <span className="text-[8px]">★ Default</span>
                            )}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel className="text-[10px]">
                          User Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setRoleUser(user)}>
                          <ShieldCheck className="mr-2 size-3.5" />
                          <span>Assign Roles</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openBranchModal(user)}>
                          <Building2 className="mr-2 size-3.5" />
                          <span>Manage Branches</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordUser(user)}>
                          <KeyRound className="mr-2 size-3.5" />
                          <span>Reset Password</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.id !== currentUserId && (
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user)}
                            className={
                              user.status === "ACTIVE"
                                ? "text-destructive focus:text-destructive"
                                : "text-primary focus:text-primary"
                            }
                          >
                            {user.status === "ACTIVE" ? (
                              <>
                                <UserX className="mr-2 size-3.5" />
                                <span>Suspend Account</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 size-3.5" />
                                <span>Activate Account</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Assignment Modal */}
      <Dialog
        open={!!roleUser}
        onOpenChange={(open) => !open && setRoleUser(null)}
      >
        <DialogContent className="max-w-md">
          {roleUser && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Manage Roles: {roleUser.name}</DialogTitle>
                <DialogDescription>
                  Grant global or branch scoped permissions to this staff member
                </DialogDescription>
              </DialogHeader>

              {/* Current Role Grants */}
              <div className="space-y-2">
                <span className="text-foreground text-xs font-semibold">
                  Current Active Roles
                </span>
                <div className="bg-muted/20 max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
                  {roleUser.userRoles.length === 0 ? (
                    <span className="text-muted-foreground text-xs italic">
                      No roles granted
                    </span>
                  ) : (
                    roleUser.userRoles.map((ur) => (
                      <div
                        key={ur.id}
                        className="hover:bg-muted/50 flex items-center justify-between rounded p-1.5 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">
                            {ur.role.name}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            Scope:{" "}
                            {ur.branch
                              ? ur.branch.name
                              : "Global (All Branches)"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive size-6"
                          onClick={() => handleRevokeRole(ur.id)}
                          disabled={isPending}
                          title="Revoke Role"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Grant New Role Form */}
              <form
                onSubmit={handleAssignRole}
                className="space-y-3 border-t pt-2"
              >
                <span className="text-foreground text-xs font-semibold">
                  Grant New Role
                </span>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-foreground text-[10px] font-medium">
                      Select Role *
                    </label>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    >
                      <option value="">Select a role...</option>
                      {allRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} ({role.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-foreground text-[10px] font-medium">
                      Branch Scope (Optional)
                    </label>
                    <select
                      value={selectedRoleBranchId}
                      onChange={(e) => setSelectedRoleBranchId(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    >
                      <option value="">Global Scope (All Branches)</option>
                      {allBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRoleUser(null)}
                    disabled={isPending}
                  >
                    Done
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !selectedRoleId}
                  >
                    {isPending ? "Granting..." : "Grant Role"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Branches Modal */}
      <Dialog
        open={!!branchUser}
        onOpenChange={(open) => !open && setBranchUser(null)}
      >
        <DialogContent className="max-w-md">
          {branchUser && (
            <form onSubmit={handleUpdateBranches} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Manage Branches: {branchUser.name}</DialogTitle>
                <DialogDescription>
                  Configure physical branch authorization and designated default
                  branch
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <label className="text-foreground text-xs font-semibold">
                    Assigned Branches
                  </label>
                  <div className="bg-muted/20 max-h-48 space-y-1 overflow-y-auto rounded-md border p-2.5">
                    {allBranches.map((branch) => {
                      const isChecked = userSelectedBranches.includes(
                        branch.id
                      );
                      return (
                        <label
                          key={branch.id}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {
                              if (isChecked) {
                                const next = userSelectedBranches.filter(
                                  (id) => id !== branch.id
                                );
                                setUserSelectedBranches(next);
                                if (userDefaultBranch === branch.id) {
                                  setUserDefaultBranch(next[0] || "");
                                }
                              } else {
                                const next = [
                                  ...userSelectedBranches,
                                  branch.id,
                                ];
                                setUserSelectedBranches(next);
                                if (!userDefaultBranch) {
                                  setUserDefaultBranch(branch.id);
                                }
                              }
                            }}
                          />
                          <span className="text-foreground font-medium">
                            {branch.name}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {branch.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {userSelectedBranches.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-foreground text-xs font-semibold">
                      Default Branch
                    </label>
                    <select
                      value={userDefaultBranch}
                      onChange={(e) => setUserDefaultBranch(e.target.value)}
                      className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    >
                      {userSelectedBranches.map((bId) => {
                        const branch = allBranches.find((b) => b.id === bId);
                        return (
                          <option key={bId} value={bId}>
                            {branch ? branch.name : bId}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBranchUser(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Branches"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog
        open={!!passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
      >
        <DialogContent className="max-w-sm">
          {passwordUser && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter a new password for {passwordUser.name} (
                  {passwordUser.email})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5 py-2">
                <label className="text-foreground text-xs font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-input bg-background focus:ring-primary w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordUser(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || newPassword.length < 8}
                >
                  {isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
