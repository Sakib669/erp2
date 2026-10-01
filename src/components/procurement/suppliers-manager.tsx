"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Search,
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
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
} from "@/actions/procurement-actions";

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  paymentTermsDays: number;
  address: string | null;
  isActive: boolean;
  _count?: { purchaseOrders: number };
}

interface SuppliersManagerProps {
  companyId: string;
  initialSuppliers: SupplierItem[];
}

export function SuppliersManager({
  companyId,
  initialSuppliers,
}: SuppliersManagerProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] =
    React.useState<SupplierItem[]>(initialSuppliers);
  const [search, setSearch] = React.useState("");

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createCode, setCreateCode] = React.useState("");
  const [createName, setCreateName] = React.useState("");
  const [createContactPerson, setCreateContactPerson] = React.useState("");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPhone, setCreatePhone] = React.useState("");
  const [createTaxId, setCreateTaxId] = React.useState("");
  const [createTerms, setCreateTerms] = React.useState(30);
  const [createAddress, setCreateAddress] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit modal state
  const [editSupplier, setEditSupplier] = React.useState<SupplierItem | null>(
    null
  );
  const [editName, setEditName] = React.useState("");
  const [editContactPerson, setEditContactPerson] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editTaxId, setEditTaxId] = React.useState("");
  const [editTerms, setEditTerms] = React.useState(30);
  const [editAddress, setEditAddress] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);

  // Delete modal state
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredSuppliers = React.useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.email && s.email.toLowerCase().includes(term))
    );
  }, [suppliers, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);

    const res = await createSupplierAction({
      companyId,
      code: createCode,
      name: createName,
      contactPerson: createContactPerson || undefined,
      email: createEmail || undefined,
      phone: createPhone || undefined,
      taxId: createTaxId || undefined,
      paymentTermsDays: Number(createTerms),
      address: createAddress || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to create supplier");
      return;
    }

    setIsCreateOpen(false);
    setCreateCode("");
    setCreateName("");
    setCreateContactPerson("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateTaxId("");
    setCreateTerms(30);
    setCreateAddress("");
    router.refresh();
  };

  const openEdit = (supplier: SupplierItem) => {
    setEditSupplier(supplier);
    setEditName(supplier.name);
    setEditContactPerson(supplier.contactPerson || "");
    setEditEmail(supplier.email || "");
    setEditPhone(supplier.phone || "");
    setEditTaxId(supplier.taxId || "");
    setEditTerms(supplier.paymentTermsDays);
    setEditAddress(supplier.address || "");
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;
    setEditError(null);
    setIsSubmitting(true);

    const res = await updateSupplierAction({
      id: editSupplier.id,
      name: editName,
      contactPerson: editContactPerson || null,
      email: editEmail || null,
      phone: editPhone || null,
      taxId: editTaxId || null,
      paymentTermsDays: Number(editTerms),
      address: editAddress || null,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setEditError(res.error || "Failed to update supplier");
      return;
    }

    setEditSupplier(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    setIsSubmitting(true);

    const res = await deleteSupplierAction(deleteId);
    setIsSubmitting(false);

    if (!res.success) {
      setDeleteError(res.error || "Failed to delete supplier");
      return;
    }

    setDeleteId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
            <Link
              href="/procurement"
              className="flex items-center gap-1 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Procurement
            </Link>
            <span>/</span>
            <span>Vendors & Suppliers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Suppliers Directory
          </h1>
          <p className="text-muted-foreground text-sm">
            Maintain verified vendor accounts, contact persons, tax identifiers,
            and agreed payment terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Register Supplier
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Suppliers
            </CardTitle>
            <Truck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Active vendor partners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Standard Terms
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Net 30 Days</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Default payment cycle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Rate
            </CardTitle>
            <CheckCircle2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-muted-foreground mt-1 text-xs">
              With valid tax information
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Registered Suppliers</CardTitle>
              <CardDescription>
                Company wide vendor list for purchase orders and goods receipt
                matching.
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search code, name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                  <TableHead>Code</TableHead>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No suppliers found. Click &quot;Register Supplier&quot; to
                      add your first vendor.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono font-medium">
                        {supplier.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.contactPerson && (
                          <div className="text-muted-foreground text-xs">
                            Attn: {supplier.contactPerson}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {supplier.email && (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Net {supplier.paymentTermsDays} Days
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {supplier.taxId || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {supplier._count?.purchaseOrders ?? 0} POs
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supplier.isActive ? "default" : "secondary"}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(supplier)}
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteId(supplier.id);
                              setDeleteError(null);
                            }}
                            title="Delete Supplier"
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

      {/* Create Supplier Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Register New Supplier</DialogTitle>
              <DialogDescription>
                Add an authorized commercial vendor account for procurement
                orders.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="bg-destructive/15 text-destructive my-3 flex items-center gap-2 rounded p-3 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Supplier Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g. SUP-DELL-01"
                    value={createCode}
                    onChange={(e) =>
                      setCreateCode(e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Company / Vendor Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Dell Technologies Inc"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input
                    id="contact"
                    placeholder="e.g. Michael Scott"
                    value={createContactPerson}
                    onChange={(e) => setCreateContactPerson(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="procurement@vendor.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1-555-0199"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taxId">Tax / VAT ID</Label>
                  <Input
                    id="taxId"
                    placeholder="VAT-99201"
                    value={createTaxId}
                    onChange={(e) => setCreateTaxId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="terms">Terms (Days)</Label>
                  <Input
                    id="terms"
                    type="number"
                    min={0}
                    value={createTerms}
                    onChange={(e) => setCreateTerms(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Billing / Physical Address</Label>
                <Input
                  id="address"
                  placeholder="Street, City, State, Country"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={!!editSupplier}
        onOpenChange={(open) => !open && setEditSupplier(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Supplier: {editSupplier?.code}</DialogTitle>
              <DialogDescription>
                Update contact records and commercial terms.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="bg-destructive/15 text-destructive my-3 flex items-center gap-2 rounded p-3 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Supplier Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contact">Contact Person</Label>
                  <Input
                    id="edit-contact"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-taxId">Tax ID</Label>
                  <Input
                    id="edit-taxId"
                    value={editTaxId}
                    onChange={(e) => setEditTaxId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-terms">Terms (Days)</Label>
                  <Input
                    id="edit-terms"
                    type="number"
                    min={0}
                    value={editTerms}
                    onChange={(e) => setEditTerms(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditSupplier(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to soft delete this supplier? Suppliers with
              active purchase orders cannot be removed.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="bg-destructive/15 text-destructive my-2 flex items-center gap-2 rounded p-3 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={handleDelete}
            >
              {isSubmitting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
