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
  Sliders,
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
  createSalaryComponentAction,
  updateSalaryComponentAction,
  deleteSalaryComponentAction,
} from "@/actions/payroll-actions";

export interface SalaryComponentItem {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: string; // EARNING, DEDUCTION
  calculationType: string; // FIXED, PERCENTAGE_OF_BASIC
  defaultAmount: number;
  isTaxable: boolean;
  createdAt: string | Date;
}

interface SalaryComponentManagerProps {
  companyId: string;
  components: SalaryComponentItem[];
  isPayrollAdmin?: boolean;
}

export function SalaryComponentManager({
  companyId,
  components: initialComponents,
  isPayrollAdmin = false,
}: SalaryComponentManagerProps) {
  const router = useRouter();
  const [components, setComponents] =
    React.useState<SalaryComponentItem[]>(initialComponents);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<SalaryComponentItem | null>(null);
  const [deletingItem, setDeletingItem] =
    React.useState<SalaryComponentItem | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState<"EARNING" | "DEDUCTION">("EARNING");
  const [calculationType, setCalculationType] = React.useState<
    "FIXED" | "PERCENTAGE_OF_BASIC"
  >("FIXED");
  const [amountInput, setAmountInput] = React.useState("0");
  const [isTaxable, setIsTaxable] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setComponents(initialComponents);
  }, [initialComponents]);

  const resetForm = () => {
    setName("");
    setCode("");
    setType("EARNING");
    setCalculationType("FIXED");
    setAmountInput("0");
    setIsTaxable(true);
    setErrorMessage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (item: SalaryComponentItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setType(item.type as "EARNING" | "DEDUCTION");
    setCalculationType(item.calculationType as "FIXED" | "PERCENTAGE_OF_BASIC");
    if (item.calculationType === "PERCENTAGE_OF_BASIC") {
      setAmountInput((item.defaultAmount / 100).toFixed(2));
    } else {
      setAmountInput((item.defaultAmount / 100).toFixed(2));
    }
    setIsTaxable(item.isTaxable);
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const parsedFloat = parseFloat(amountInput) || 0;
      const intAmount =
        calculationType === "PERCENTAGE_OF_BASIC"
          ? Math.round(parsedFloat * 100)
          : Math.round(parsedFloat * 100);

      const res = await createSalaryComponentAction({
        companyId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        calculationType,
        defaultAmount: intAmount,
        isTaxable,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create salary component");
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
    if (!editingItem) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const parsedFloat = parseFloat(amountInput) || 0;
      const intAmount =
        calculationType === "PERCENTAGE_OF_BASIC"
          ? Math.round(parsedFloat * 100)
          : Math.round(parsedFloat * 100);

      const res = await updateSalaryComponentAction({
        id: editingItem.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        calculationType,
        defaultAmount: intAmount,
        isTaxable,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update salary component");
        setLoading(false);
        return;
      }

      setEditingItem(null);
      resetForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await deleteSalaryComponentAction(deletingItem.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete salary component");
        setLoading(false);
        return;
      }

      setDeletingItem(null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredComponents = components.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q);
    const matchesType = typeFilter === "ALL" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/payroll"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payroll Runs
            </Link>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sliders className="text-primary h-6 w-6" />
            Salary Components
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure recurring earnings and deduction components for company
            payslips
          </p>
        </div>

        {isPayrollAdmin && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Component
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search components by name or code..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[200px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="EARNING">Earnings Only</SelectItem>
                  <SelectItem value="DEDUCTION">Deductions Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Compensation Items</CardTitle>
          <CardDescription>
            Rules applied automatically to employee monthly calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Calculation Method</TableHead>
                  <TableHead className="text-right">Default Value</TableHead>
                  <TableHead>Tax Status</TableHead>
                  {isPayrollAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComponents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isPayrollAdmin ? 7 : 6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No salary components configured
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComponents.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-foreground font-semibold">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {item.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.type === "EARNING" ? (
                          <Badge
                            variant="secondary"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          >
                            Earning
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="border-amber-500/20 bg-amber-500/10 text-amber-600"
                          >
                            Deduction
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.calculationType === "PERCENTAGE_OF_BASIC"
                          ? "Percentage of Basic"
                          : "Fixed Minor Units"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.calculationType === "PERCENTAGE_OF_BASIC"
                          ? `${(item.defaultAmount / 100).toFixed(2)} %`
                          : `$${(item.defaultAmount / 100).toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {item.isTaxable ? (
                          <span className="text-muted-foreground text-xs">
                            Taxable
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-medium">
                            Non Taxable
                          </span>
                        )}
                      </TableCell>
                      {isPayrollAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                              title="Edit Component"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setErrorMessage(null);
                                setDeletingItem(item);
                              }}
                              title="Delete Component"
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
              <DialogTitle>Add Salary Component</DialogTitle>
              <DialogDescription>
                Define a new compensation allowance or deduction line item
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
                    placeholder="e.g. Housing Allowance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-code">Code</Label>
                  <Input
                    id="create-code"
                    placeholder="e.g. HRA"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={type}
                    onValueChange={(val: "EARNING" | "DEDUCTION") =>
                      setType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EARNING">Earning</SelectItem>
                      <SelectItem value="DEDUCTION">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Calculation Method</Label>
                  <Select
                    value={calculationType}
                    onValueChange={(val: "FIXED" | "PERCENTAGE_OF_BASIC") =>
                      setCalculationType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                      <SelectItem value="PERCENTAGE_OF_BASIC">
                        % of Basic
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-amount">
                  {calculationType === "PERCENTAGE_OF_BASIC"
                    ? "Percentage Value (%)"
                    : "Default Fixed Amount ($)"}
                </Label>
                <Input
                  id="create-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isTaxable}
                    onChange={(e) => setIsTaxable(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Subject to Tax Assessment</span>
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
                {loading ? "Saving..." : "Create Component"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Salary Component</DialogTitle>
              <DialogDescription>
                Modify compensation calculation parameters
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={type}
                    onValueChange={(val: "EARNING" | "DEDUCTION") =>
                      setType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EARNING">Earning</SelectItem>
                      <SelectItem value="DEDUCTION">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Calculation Method</Label>
                  <Select
                    value={calculationType}
                    onValueChange={(val: "FIXED" | "PERCENTAGE_OF_BASIC") =>
                      setCalculationType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                      <SelectItem value="PERCENTAGE_OF_BASIC">
                        % of Basic
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">
                  {calculationType === "PERCENTAGE_OF_BASIC"
                    ? "Percentage Value (%)"
                    : "Default Fixed Amount ($)"}
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isTaxable}
                    onChange={(e) => setIsTaxable(e.target.checked)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <span>Subject to Tax Assessment</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
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
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Salary Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingItem?.name}? Components
              referenced in historical payslips cannot be deleted.
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
              onClick={() => setDeletingItem(null)}
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
