"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Plus,
  Search,
  AlertCircle,
  ArrowLeft,
  Warehouse as WarehouseIcon,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Send,
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
  recordStockMovementAction,
  transferStockAction,
} from "@/actions/inventory-actions";

export interface StockMovementItem {
  id: string;
  type: "INWARD" | "OUTWARD" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  unitCost: number; // cents
  reference: string | null;
  notes: string | null;
  batchNumber: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  item: {
    id: string;
    name: string;
    code: string;
    uom: string;
  };
  createdByUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  branchId: string;
}

export interface ItemOption {
  id: string;
  name: string;
  code: string;
  uom: string;
  costPrice: number;
}

interface StockMovementsLedgerProps {
  movements: StockMovementItem[];
  warehouses: WarehouseOption[];
  items: ItemOption[];
  isInventoryAdmin?: boolean;
}

export function StockMovementsLedger({
  movements: initialMovements,
  warehouses,
  items,
  isInventoryAdmin = false,
}: StockMovementsLedgerProps) {
  const router = useRouter();
  const [movements, setMovements] =
    React.useState<StockMovementItem[]>(initialMovements);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  // Dialog states
  const [isPostOpen, setIsPostOpen] = React.useState(false);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);

  // Form states for Movement
  const [postWarehouseId, setPostWarehouseId] = React.useState(
    warehouses[0]?.id || ""
  );
  const [postItemId, setPostItemId] = React.useState(items[0]?.id || "");
  const [postType, setPostType] = React.useState<
    "INWARD" | "OUTWARD" | "ADJUSTMENT"
  >("INWARD");
  const [postQuantity, setPostQuantity] = React.useState("");
  const [postReference, setPostReference] = React.useState("");
  const [postNotes, setPostNotes] = React.useState("");

  // Form states for Transfer
  const [transferFromId, setTransferFromId] = React.useState(
    warehouses[0]?.id || ""
  );
  const [transferToId, setTransferToId] = React.useState(
    warehouses[1]?.id || warehouses[0]?.id || ""
  );
  const [transferItemId, setTransferItemId] = React.useState(
    items[0]?.id || ""
  );
  const [transferQty, setTransferQty] = React.useState("");
  const [transferRef, setTransferRef] = React.useState("");
  const [transferNotes, setTransferNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMovements(initialMovements);
  }, [initialMovements]);

  const handlePostMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const qty = parseInt(postQuantity, 10);
      if (isNaN(qty) || qty <= 0) {
        setErrorMessage("Quantity must be a positive integer");
        setLoading(false);
        return;
      }

      const res = await recordStockMovementAction({
        warehouseId: postWarehouseId,
        itemId: postItemId,
        type: postType,
        quantity: qty,
        reference: postReference.trim() || undefined,
        notes: postNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to record stock movement");
        setLoading(false);
        return;
      }

      setIsPostOpen(false);
      setPostQuantity("");
      setPostReference("");
      setPostNotes("");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (transferFromId === transferToId) {
      setErrorMessage("Source and destination warehouses must be different");
      return;
    }

    setLoading(true);

    try {
      const qty = parseInt(transferQty, 10);
      if (isNaN(qty) || qty <= 0) {
        setErrorMessage("Transfer quantity must be a positive integer");
        setLoading(false);
        return;
      }

      const res = await transferStockAction({
        fromWarehouseId: transferFromId,
        toWarehouseId: transferToId,
        itemId: transferItemId,
        quantity: qty,
        reference: transferRef.trim() || undefined,
        notes: transferNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to transfer stock");
        setLoading(false);
        return;
      }

      setIsTransferOpen(false);
      setTransferQty("");
      setTransferRef("");
      setTransferNotes("");
      router.refresh();
    } catch {
      setErrorMessage("An unexpected server error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      m.item.name.toLowerCase().includes(q) ||
      m.item.code.toLowerCase().includes(q) ||
      m.warehouse.name.toLowerCase().includes(q) ||
      (m.reference && m.reference.toLowerCase().includes(q));

    const matchesWarehouse =
      warehouseFilter === "ALL" || m.warehouse.id === warehouseFilter;

    const matchesType = typeFilter === "ALL" || m.type === typeFilter;

    return matchesSearch && matchesWarehouse && matchesType;
  });

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
              <ArrowRightLeft className="text-primary h-6 w-6" />
              Stock Movement Ledger
            </h1>
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            Append only stock transaction ledger, goods receipts, and inter
            warehouse transfers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="outline" className="gap-2">
              <Boxes className="h-4 w-4" />
              Item Catalog
            </Button>
          </Link>
          <Link href="/inventory/warehouses">
            <Button variant="outline" className="gap-2">
              <WarehouseIcon className="h-4 w-4" />
              Warehouses
            </Button>
          </Link>
          {isInventoryAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsTransferOpen(true)}
                className="gap-2"
              >
                <Send className="h-4 w-4" /> Transfer Stock
              </Button>
              <Button onClick={() => setIsPostOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Post Movement
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search item, warehouse, or reference..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Select
                value={warehouseFilter}
                onValueChange={setWarehouseFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Movement Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Movement Types</SelectItem>
                  <SelectItem value="INWARD">Inward Receipts</SelectItem>
                  <SelectItem value="OUTWARD">Outward Issues</SelectItem>
                  <SelectItem value="TRANSFER">Transfers</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Log</CardTitle>
          <CardDescription>
            Immutable physical stock changes with audit metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Valuation</TableHead>
                  <TableHead>Reference / Memo</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No stock movements recorded matching filter criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => {
                    const totalCents = m.quantity * m.unitCost;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground text-xs font-semibold">
                            {m.warehouse.name}
                          </div>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {m.warehouse.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground text-xs font-medium">
                            {m.item.name}
                          </div>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {m.item.code} ({m.item.uom})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              m.type === "INWARD"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                : m.type === "OUTWARD"
                                  ? "border-rose-500/20 bg-rose-500/10 text-rose-600"
                                  : m.type === "TRANSFER"
                                    ? "border-sky-500/20 bg-sky-500/10 text-sky-600"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                            }
                          >
                            {m.type === "INWARD" && (
                              <ArrowDownLeft className="mr-1 h-3 w-3" />
                            )}
                            {m.type === "OUTWARD" && (
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                            )}
                            {m.type === "TRANSFER" && (
                              <Send className="mr-1 h-3 w-3" />
                            )}
                            {m.type === "ADJUSTMENT" && (
                              <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          {m.type === "OUTWARD"
                            ? `-${m.quantity}`
                            : `+${m.quantity}`}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ${(m.unitCost / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          ${(totalCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {m.reference && (
                            <div className="text-foreground font-medium">
                              {m.reference}
                            </div>
                          )}
                          {m.notes && <div>{m.notes}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {m.createdByUser.name}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Post Movement Dialog */}
      <Dialog open={isPostOpen} onOpenChange={setIsPostOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handlePostMovement}>
            <DialogHeader>
              <DialogTitle>Post Stock Movement</DialogTitle>
              <DialogDescription>
                Record physical goods receipt, stock dispatch, or manual
                adjustment
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
                <Label>Warehouse</Label>
                <Select
                  value={postWarehouseId}
                  onValueChange={setPostWarehouseId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Item</Label>
                <Select value={postItemId} onValueChange={setPostItemId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({it.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Movement Type</Label>
                  <Select
                    value={postType}
                    onValueChange={(val: "INWARD" | "OUTWARD" | "ADJUSTMENT") =>
                      setPostType(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INWARD">Inward (Receipt)</SelectItem>
                      <SelectItem value="OUTWARD">Outward (Issue)</SelectItem>
                      <SelectItem value="ADJUSTMENT">
                        Adjustment (Physical Count)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-qty">Quantity</Label>
                  <Input
                    id="post-qty"
                    type="number"
                    min="1"
                    placeholder="e.g. 25"
                    value={postQuantity}
                    onChange={(e) => setPostQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-ref">Reference Document</Label>
                <Input
                  id="post-ref"
                  placeholder="e.g. PO-2026-88 or DISPATCH-01"
                  value={postReference}
                  onChange={(e) => setPostReference(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-notes">Notes / Reason</Label>
                <Input
                  id="post-notes"
                  placeholder="Optional movement justification"
                  value={postNotes}
                  onChange={(e) => setPostNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPostOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Movement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleTransfer}>
            <DialogHeader>
              <DialogTitle>Inter-Warehouse Transfer</DialogTitle>
              <DialogDescription>
                Atomically shift stock inventory from one warehouse location to
                another
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
                  <Label>Source Warehouse</Label>
                  <Select
                    value={transferFromId}
                    onValueChange={setTransferFromId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Destination Warehouse</Label>
                  <Select value={transferToId} onValueChange={setTransferToId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses
                        .filter((w) => w.id !== transferFromId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} ({w.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Item to Transfer</Label>
                <Select
                  value={transferItemId}
                  onValueChange={setTransferItemId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({it.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transfer-qty">Transfer Quantity</Label>
                <Input
                  id="transfer-qty"
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transfer-ref">Transfer Reference</Label>
                <Input
                  id="transfer-ref"
                  placeholder="e.g. TRF-BOS-CHI-001"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transfer-notes">Notes</Label>
                <Input
                  id="transfer-notes"
                  placeholder="Logistics carrier or driver notes"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Transferring..." : "Execute Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
