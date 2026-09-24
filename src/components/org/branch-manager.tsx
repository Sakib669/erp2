"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
} from "@/actions/org-actions";

export interface BranchRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadquarters: boolean;
  createdAt: Date;
}

interface BranchManagerProps {
  companyId: string;
  branches: BranchRecord[];
}

export function BranchManager({ companyId, branches }: BranchManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editBranch, setEditBranch] = React.useState<BranchRecord | null>(null);
  const [deleteBranchId, setDeleteBranchId] = React.useState<string | null>(
    null
  );
  const [isPending, startTransition] = React.useTransition();

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [timezone, setTimezone] = React.useState("UTC");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isHeadquarters, setIsHeadquarters] = React.useState(false);

  const resetForm = () => {
    setName("");
    setCode("");
    setTimezone("UTC");
    setAddress("");
    setPhone("");
    setEmail("");
    setIsHeadquarters(false);
  };

  const openEditModal = (branch: BranchRecord) => {
    setEditBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setTimezone(branch.timezone);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setEmail(branch.email || "");
    setIsHeadquarters(branch.isHeadquarters);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createBranchAction({
        companyId,
        name,
        code: code.toUpperCase(),
        timezone,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isHeadquarters,
      });

      if (res.success) {
        toast.success(`Branch ${name} created successfully`);
        setCreateOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create branch");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;

    startTransition(async () => {
      const res = await updateBranchAction(editBranch.id, {
        name,
        code: code.toUpperCase(),
        timezone,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isHeadquarters,
      });

      if (res.success) {
        toast.success(`Branch ${name} updated`);
        setEditBranch(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update branch");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteBranchId) return;

    startTransition(async () => {
      const res = await deleteBranchAction(deleteBranchId);
      if (res.success) {
        toast.success("Branch soft deleted and archived");
        setDeleteBranchId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete branch");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            Physical Branches ({branches.length})
          </h2>
          <p className="text-muted-foreground text-xs">
            Each branch operates with strict data isolation and independent
            operational ledgers.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 text-xs">
              <Plus className="size-4" /> Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add Physical Branch</DialogTitle>
                <DialogDescription>
                  Register a new physical office or regional branch facility.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-4 text-xs">
                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-name" className="text-right">
                    Branch Name *
                  </Label>
                  <Input
                    id="branch-name"
                    required
                    placeholder="e.g. Asia Pacific Regional"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-code" className="text-right">
                    Branch Code *
                  </Label>
                  <Input
                    id="branch-code"
                    required
                    placeholder="e.g. APAC-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="col-span-3 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-tz" className="text-right">
                    Timezone
                  </Label>
                  <Input
                    id="branch-tz"
                    placeholder="UTC or America/New_York"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="branch-email"
                    type="email"
                    placeholder="branch@enterprise.corp"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="branch-phone"
                    placeholder="+1 (555) 019-2831"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3">
                  <Label htmlFor="branch-addr" className="text-right">
                    Address
                  </Label>
                  <Input
                    id="branch-addr"
                    placeholder="100 Enterprise Way, Suite 400"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="col-span-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-3 pt-1">
                  <span />
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="branch-hq"
                      checked={isHeadquarters}
                      onCheckedChange={(checked) =>
                        setIsHeadquarters(checked === true)
                      }
                    />
                    <label
                      htmlFor="branch-hq"
                      className="cursor-pointer text-xs leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Designate as Primary Headquarters
                    </label>
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
                  {isPending ? "Creating..." : "Create Branch"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Card
            key={b.id}
            className="border-border bg-card relative overflow-hidden"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-foreground text-sm font-bold">
                    {b.name}
                  </CardTitle>
                  <CardDescription className="mt-0.5 font-mono text-xs">
                    {b.code}
                  </CardDescription>
                </div>
                {b.isHeadquarters ? (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    Headquarters
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Branch
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2.5 pb-4 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="text-primary size-3.5 shrink-0" />
                <span>{b.timezone}</span>
              </div>
              {b.address && (
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="text-primary size-3.5 shrink-0" />
                  <span className="truncate">{b.address}</span>
                </div>
              )}
              {b.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-primary size-3.5 shrink-0" />
                  <span>{b.phone}</span>
                </div>
              )}
              {b.email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="text-primary size-3.5 shrink-0" />
                  <span className="truncate">{b.email}</span>
                </div>
              )}

              <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(b)}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Edit2 className="size-3.5" /> Edit
                </Button>
                {!b.isHeadquarters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteBranchId(b.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 gap-1.5 text-xs"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Branch Modal */}
      <Dialog
        open={!!editBranch}
        onOpenChange={(open) => !open && setEditBranch(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Branch: {editBranch?.name}</DialogTitle>
              <DialogDescription>
                Update physical branch facility configuration.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-xs">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-name" className="text-right">
                  Branch Name *
                </Label>
                <Input
                  id="edit-branch-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-code" className="text-right">
                  Branch Code *
                </Label>
                <Input
                  id="edit-branch-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="col-span-3 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-tz" className="text-right">
                  Timezone
                </Label>
                <Input
                  id="edit-branch-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-branch-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="edit-branch-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="edit-branch-addr" className="text-right">
                  Address
                </Label>
                <Input
                  id="edit-branch-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="col-span-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-3 pt-1">
                <span />
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="edit-branch-hq"
                    checked={isHeadquarters}
                    onCheckedChange={(checked) =>
                      setIsHeadquarters(checked === true)
                    }
                  />
                  <label
                    htmlFor="edit-branch-hq"
                    className="cursor-pointer text-xs leading-none font-medium"
                  >
                    Primary Headquarters
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditBranch(null)}
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

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteBranchId}
        onOpenChange={(open) => !open && setDeleteBranchId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Branch Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This branch will be soft deleted. Historic audit logs and
              financial vouchers will be preserved, but active users will no
              longer be able to select this branch context.
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
