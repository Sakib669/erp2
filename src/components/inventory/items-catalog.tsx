"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  DollarSign,
  AlertTriangle,
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
  createItemAction,
  updateItemAction,
  deleteItemAction,
  createItemCategoryAction,
} from "@/actions/inventory-actions";

export interface ItemStockLevelItem {
  id: string;
  warehouseId: string;
  quantityOnHand: number;
  warehouse: {
    id: string;
    name: string;
    code: string;
    branchId: string;
  };
}

export interface ItemCatalogItem {
  id: string;
  companyId: string;
  categoryId: string | null;
  code: string;
  name: string;
  description: string | null;
  uom: string;
  costPrice: number; // cents
  sellingPrice: number; // cents
  minStockLevel: number;
  category?: {
    id: string;
    name: string;
    code: string;
  } | null;
  stockLevels: ItemStockLevelItem[];
}

export interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  branchId: string;
}

interface ItemsCatalogProps {
  companyId: string;
  items: ItemCatalogItem[];
  categories: CategoryOption[];
  warehouses: WarehouseOption[];
  isInventoryAdmin?: boolean;
}

export function ItemsCatalog({
  companyId,
  items: initialItems,
  categories,
  isInventoryAdmin = false,
}: ItemsCatalogProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<ItemCatalogItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ItemCatalogItem | null>(
    null
  );
  const [deletingItem, setDeletingItem] =
    React.useState<ItemCatalogItem | null>(null);

  // Form states for Item
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("NONE");
  const [description, setDescription] = React.useState("");
  const [uom, setUom] = React.useState<
    "PCS" | "BOX" | "KG" | "LTR" | "MTR" | "PACK"
  >("PCS");
  const [costPriceInput, setCostPriceInput] = React.useState("");
  const [sellingPriceInput, setSellingPriceInput] = React.useState("");
  const [minStockInput, setMinStockInput] = React.useState("0");

  // Form states for Category
  const [catCode, setCatCode] = React.useState("");
  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const resetItemForm = () => {
    setCode("");
    setName("");
    setCategoryId("NONE");
    setDescription("");
    setUom("PCS");
    setCostPriceInput("");
    setSellingPriceInput("");
    setMinStockInput("0");
    setErrorMessage(null);
  };

  const openCreateDialog = () => {
    resetItemForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (item: ItemCatalogItem) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategoryId(item.categoryId || "NONE");
    setDescription(item.description || "");
    setUom(item.uom as "PCS" | "BOX" | "KG" | "LTR" | "MTR" | "PACK");
    setCostPriceInput((item.costPrice / 100).toFixed(2));
    setSellingPriceInput((item.sellingPrice / 100).toFixed(2));
    setMinStockInput(item.minStockLevel.toString());
    setErrorMessage(null);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const costCents = Math.round((parseFloat(costPriceInput) || 0) * 100);
      const sellCents = Math.round((parseFloat(sellingPriceInput) || 0) * 100);
      const minStock = parseInt(minStockInput, 10) || 0;

      const res = await createItemAction({
        companyId,
        categoryId: categoryId === "NONE" ? undefined : categoryId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        uom,
        costPrice: costCents,
        sellingPrice: sellCents,
        minStockLevel: minStock,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create item");
        setLoading(false);
        return;
      }

      setIsCreateOpen(false);
      resetItemForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const costCents = Math.round((parseFloat(costPriceInput) || 0) * 100);
      const sellCents = Math.round((parseFloat(sellingPriceInput) || 0) * 100);
      const minStock = parseInt(minStockInput, 10) || 0;

      const res = await updateItemAction({
        id: editingItem.id,
        categoryId: categoryId === "NONE" ? undefined : categoryId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        uom,
        costPrice: costCents,
        sellingPrice: sellCents,
        minStockLevel: minStock,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update item");
        setLoading(false);
        return;
      }

      setEditingItem(null);
      resetItemForm();
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await deleteItemAction(deletingItem.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete item");
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await createItemCategoryAction({
        companyId,
        code: catCode.trim().toUpperCase(),
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create category");
        setLoading(false);
        return;
      }

      setIsCategoryOpen(false);
      setCatCode("");
      setCatName("");
      setCatDesc("");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));

    const matchesCategory =
      categoryFilter === "ALL" || item.categoryId === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate metrics
  const totalSKUs = items.length;
  const totalUnits = items.reduce(
    (sum, item) =>
      sum + item.stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0),
    0
  );
  const totalValuation = items.reduce((sum, item) => {
    const units = item.stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0);
    return sum + units * item.costPrice;
  }, 0);

  const lowStockCount = items.filter((item) => {
    const units = item.stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0);
    return units <= item.minStockLevel && item.minStockLevel > 0;
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Boxes className="text-primary h-6 w-6" />
            Inventory Catalog
          </h1>
          <p className="text-muted-foreground text-sm">
            Multi warehouse stock levels, item variants, and valuation metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory/warehouses">
            <Button variant="outline" className="gap-2">
              <WarehouseIcon className="h-4 w-4" />
              Warehouses
            </Button>
          </Link>
          <Link href="/inventory/movements">
            <Button variant="outline" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Stock Movements
            </Button>
          </Link>
          {isInventoryAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsCategoryOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Category
              </Button>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
              Total Catalog SKUs
              <Boxes className="text-primary h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{totalSKUs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
              Units on Hand
              <WarehouseIcon className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              {totalUnits.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
              Inventory Valuation
              <DollarSign className="h-4 w-4 text-sky-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              $
              {(totalValuation / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
              Low Stock Alerts
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-amber-600">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search items by code, name, or description..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Register Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Registry</CardTitle>
          <CardDescription>
            Configured stock keeping units, pricing, and physical warehouse
            distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Code</TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                  {isInventoryAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isInventoryAdmin ? 8 : 7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No inventory items found matching criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const totalQty = item.stockLevels.reduce(
                      (s, sl) => s + sl.quantityOnHand,
                      0
                    );
                    const isLowStock =
                      totalQty <= item.minStockLevel && item.minStockLevel > 0;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {item.code}
                          </Badge>
                        </TableCell>
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
                          {item.category ? (
                            <Badge variant="secondary">
                              {item.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.uom}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ${(item.costPrice / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          ${(item.sellingPrice / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono font-bold">
                            {totalQty.toLocaleString()}
                          </div>
                          {isLowStock && (
                            <span className="block text-[10px] font-semibold text-amber-600">
                              Low Stock (&lt;={item.minStockLevel})
                            </span>
                          )}
                        </TableCell>
                        {isInventoryAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(item)}
                                title="Edit Item"
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
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Item Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <form onSubmit={handleCreateItem}>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>
                Define a new SKU with unit pricing and stock thresholds
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
                  <Label htmlFor="create-item-code">SKU Code</Label>
                  <Input
                    id="create-item-code"
                    placeholder="e.g. LAPTOP-DELL-15"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Unassigned</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-item-name">Item Name</Label>
                <Input
                  id="create-item-name"
                  placeholder="e.g. Dell Latitude 5540 15-inch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit of Measure</Label>
                  <Select
                    value={uom}
                    onValueChange={(
                      val: "PCS" | "BOX" | "KG" | "LTR" | "MTR" | "PACK"
                    ) => setUom(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                      <SelectItem value="BOX">Boxes (BOX)</SelectItem>
                      <SelectItem value="KG">Kilograms (KG)</SelectItem>
                      <SelectItem value="LTR">Liters (LTR)</SelectItem>
                      <SelectItem value="MTR">Meters (MTR)</SelectItem>
                      <SelectItem value="PACK">Packs (PACK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-cost">Cost Price ($)</Label>
                  <Input
                    id="create-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-selling">Selling Price ($)</Label>
                  <Input
                    id="create-selling"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={sellingPriceInput}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-min-stock">
                    Min Stock Alert Level
                  </Label>
                  <Input
                    id="create-min-stock"
                    type="number"
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-item-desc">Description</Label>
                  <Input
                    id="create-item-desc"
                    placeholder="Optional item details"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
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
                {loading ? "Saving..." : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[540px]">
          <form onSubmit={handleUpdateItem}>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Modify SKU specifications and price settings
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
                  <Label htmlFor="edit-item-code">SKU Code</Label>
                  <Input
                    id="edit-item-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Unassigned</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input
                  id="edit-item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit of Measure</Label>
                  <Select
                    value={uom}
                    onValueChange={(
                      val: "PCS" | "BOX" | "KG" | "LTR" | "MTR" | "PACK"
                    ) => setUom(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                      <SelectItem value="BOX">Boxes (BOX)</SelectItem>
                      <SelectItem value="KG">Kilograms (KG)</SelectItem>
                      <SelectItem value="LTR">Liters (LTR)</SelectItem>
                      <SelectItem value="MTR">Meters (MTR)</SelectItem>
                      <SelectItem value="PACK">Packs (PACK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-cost">Cost Price ($)</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-selling">Selling Price ($)</Label>
                  <Input
                    id="edit-selling"
                    type="number"
                    step="0.01"
                    value={sellingPriceInput}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-min-stock">Min Stock Alert Level</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-item-desc">Description</Label>
                  <Input
                    id="edit-item-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
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

      {/* Delete Item Dialog */}
      <Dialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingItem?.name}? Items with
              active stock on hand cannot be deleted.
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
              onClick={handleDeleteItem}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleCreateCategory}>
            <DialogHeader>
              <DialogTitle>New Item Category</DialogTitle>
              <DialogDescription>
                Define an item grouping for reporting and inventory cataloging
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
                <Label htmlFor="cat-code">Category Code</Label>
                <Input
                  id="cat-code"
                  placeholder="e.g. ELEC"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Electronics & Hardware"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Input
                  id="cat-desc"
                  placeholder="Optional category description"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryOpen(false)}
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
    </div>
  );
}
