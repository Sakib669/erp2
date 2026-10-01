"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Building,
  Boxes,
  ArrowRightLeft,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createWarehouseAction,
  updateWarehouseAction,
  deleteWarehouseAction,
} from "@/actions/inventory-actions";

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}

export interface WarehouseItem {
  id: string;
  companyId: string;
  branchId: string;
  code: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    stockLevels: number;
  };
}

interface WarehouseManagerProps {
  companyId: string;
  warehouses: WarehouseItem[];
  branches: BranchOption[];
  isInventoryAdmin?: boolean;
}

export function WarehouseManager({
  companyId,
  warehouses: initialWarehouses,
  branches,
  isInventoryAdmin = false,
}: WarehouseManagerProps) {
  const router = useRouter();
  const [warehouses, setWarehouses] =
    React.useState<WarehouseItem[]>(initialWarehouses);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    React.useState<WarehouseItem | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] =
    React.useState<WarehouseItem | null>(null);

  // Form states
  const [branchId, setBranchId] = React.useState(branches[0]?.id || "");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setWarehouses(initialWarehouses);
  }, [initialWarehouses]);

  const resetForm = () => {
    setBranchId(branches[0]?.id || "");
    setCode("");
    setName("");
    setAddress("");
    setIsDefault(false);
    setErrorMessage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (wh: WarehouseItem) => {
    setEditingWarehouse(wh);
    setBranchId(wh.branchId);
    setCode(wh.code);
    setName(wh.name);
    setAddress(wh.address || "");
    setIsDefault(wh.isDefault);
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await createWarehouseAction({
        companyId,
        branchId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim() || undefined,
        isDefault,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create warehouse");
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
    if (!editingWarehouse) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await updateWarehouseAction({
        id: editingWarehouse.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim() || undefined,
        isDefault,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update warehouse");
        setLoading(false);
        return;
      }

      setEditingWarehouse(null);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWarehouse) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await deleteWarehouseAction(deletingWarehouse.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete warehouse");
        setLoading(false);
        return;
      }

      setDeletingWarehouse(null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <WarehouseIcon className="text-primary h-6 w-6" />
              Physical Warehouses
            </h1>
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            Storage locations, physical facility addresses, and branch
            assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="outline" className="gap-2">
              <Boxes className="h-4 w-4" />
              Item Catalog
            </Button>
          </Link>
          <Link href="/inventory/movements">
            <Button variant="outline" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Stock Movements
            </Button>
          </Link>
          {isInventoryAdmin && (
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Warehouse
            </Button>
          )}
        </div>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouses Register</CardTitle>
          <CardDescription>
            Physical stock locations isolated by operating physical branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Warehouse Name</TableHead>
                  <TableHead>Branch Assignment</TableHead>
                  <TableHead>Physical Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tracked SKUs</TableHead>
                  {isInventoryAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isInventoryAdmin ? 7 : 6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No warehouses configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {wh.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground flex items-center gap-2 font-semibold">
                          {wh.name}
                          {wh.isDefault && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building className="h-3.5 w-3.5" />
                          {wh.branch.name} ({wh.branch.code})
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {wh.address || "No address specified"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {wh._count.stockLevels} items
                      </TableCell>
                      {isInventoryAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(wh)}
                              title="Edit Warehouse"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setErrorMessage(null);
                                setDeletingWarehouse(wh);
                              }}
                              title="Delete Warehouse"
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
              <DialogTitle>Add Warehouse</DialogTitle>
              <DialogDescription>
                Define a physical warehouse and assign it to an operating branch
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
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-wh-code">Warehouse Code</Label>
                  <Input
                    id="create-wh-code"
                    placeholder="e.g. WH-BOS-MAIN"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-wh-name">Warehouse Name</Label>
                  <Input
                    id="create-wh-name"
                    placeholder="e.g. Boston Central Depot"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-wh-addr">Facility Address</Label>
                <Input
                  id="create-wh-addr"
                  placeholder="e.g. 500 Industrial Parkway, Dock 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-wh-default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="create-wh-default"
                  className="cursor-pointer text-xs"
                >
                  Set as default warehouse for this branch
                </Label>
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
                {loading ? "Saving..." : "Create Warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingWarehouse)}
        onOpenChange={(open) => !open && setEditingWarehouse(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Warehouse</DialogTitle>
              <DialogDescription>
                Modify physical warehouse details
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
                  <Label htmlFor="edit-wh-code">Warehouse Code</Label>
                  <Input
                    id="edit-wh-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-wh-name">Warehouse Name</Label>
                  <Input
                    id="edit-wh-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-wh-addr">Facility Address</Label>
                <Input
                  id="edit-wh-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-wh-default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="edit-wh-default"
                  className="cursor-pointer text-xs"
                >
                  Set as default warehouse for this branch
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingWarehouse(null)}
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
        open={Boolean(deletingWarehouse)}
        onOpenChange={(open) => !open && setDeletingWarehouse(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Warehouse</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingWarehouse?.name}?
              Warehouses with active stock on hand cannot be deleted.
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
              onClick={() => setDeletingWarehouse(null)}
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
