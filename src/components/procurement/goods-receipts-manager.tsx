"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Plus,
  ArrowLeft,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  Eye,
  AlertCircle,
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
import { createGoodsReceiptAction } from "@/actions/procurement-actions";
import { GoodsReceiptStatus } from "@prisma/client";

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  branchId: string;
}

interface ApprovedPurchaseOrderOption {
  id: string;
  poNumber: string;
  branchId: string;
  supplier: { id: string; name: string };
  items: {
    id: string;
    itemId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    item: { id: string; name: string; code: string; uom: string };
  }[];
}

interface GoodsReceiptRow {
  id: string;
  grnNumber: string;
  receiptDate: Date | string;
  status: GoodsReceiptStatus;
  notes: string | null;
  purchaseOrder: {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string };
  };
  warehouse: { id: string; name: string; code: string };
  receivedByUser: { id: string; name: string };
  items: {
    id: string;
    quantityReceived: number;
    unitCost: number;
    notes: string | null;
    item: { id: string; name: string; code: string; uom: string };
  }[];
}

interface GoodsReceiptsManagerProps {
  companyId: string;
  warehouses: WarehouseOption[];
  approvedOrders: ApprovedPurchaseOrderOption[];
  initialReceipts: GoodsReceiptRow[];
  activeBranchId?: string;
}

export function GoodsReceiptsManager({
  companyId,
  warehouses,
  approvedOrders,
  initialReceipts,
  activeBranchId,
}: GoodsReceiptsManagerProps) {
  const router = useRouter();
  const [receipts, setReceipts] =
    React.useState<GoodsReceiptRow[]>(initialReceipts);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedPOId, setSelectedPOId] = React.useState<string>(
    approvedOrders[0]?.id || ""
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>(
    warehouses[0]?.id || ""
  );
  const [grnNumber, setGrnNumber] = React.useState("");
  const [receiptDate, setReceiptDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [receiptNotes, setReceiptNotes] = React.useState("");
  const [receivingQuantities, setReceivingQuantities] = React.useState<
    Record<string, number>
  >({});
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // View Details Dialog
  const [selectedReceipt, setSelectedReceipt] =
    React.useState<GoodsReceiptRow | null>(null);

  React.useEffect(() => {
    setReceipts(initialReceipts);
  }, [initialReceipts]);

  const activePO = React.useMemo(() => {
    return approvedOrders.find((po) => po.id === selectedPOId) || null;
  }, [approvedOrders, selectedPOId]);

  // When selected PO changes, initialize default quantities to remaining ordered
  React.useEffect(() => {
    if (activePO) {
      const initQtys: Record<string, number> = {};
      for (const line of activePO.items) {
        const remaining = Math.max(
          0,
          line.quantityOrdered - line.quantityReceived
        );
        initQtys[line.id] = remaining;
      }
      setReceivingQuantities(initQtys);
    }
  }, [activePO]);

  // Aggregate Metrics
  const metrics = React.useMemo(() => {
    let totalUnits = 0;
    for (const r of receipts) {
      for (const it of r.items) {
        totalUnits += it.quantityReceived;
      }
    }
    return {
      totalGRNs: receipts.length,
      totalUnits,
      activeDepots: new Set(receipts.map((r) => r.warehouse.id)).size,
    };
  }, [receipts]);

  const openCreateDialog = () => {
    setGrnNumber(
      `GRN-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, "0")}`
    );
    setSelectedPOId(approvedOrders[0]?.id || "");
    setSelectedWarehouseId(warehouses[0]?.id || "");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setReceiptNotes("");
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!activePO) {
      setCreateError("Please select a valid purchase order");
      return;
    }

    if (!selectedWarehouseId) {
      setCreateError("Please select a target warehouse for stock ingestion");
      return;
    }

    // Filter items with quantityReceived > 0
    const itemsToReceive: {
      purchaseOrderItemId: string;
      quantityReceived: number;
    }[] = [];
    for (const line of activePO.items) {
      const qty = receivingQuantities[line.id] || 0;
      if (qty > 0) {
        itemsToReceive.push({
          purchaseOrderItemId: line.id,
          quantityReceived: qty,
        });
      }
    }

    if (itemsToReceive.length === 0) {
      setCreateError(
        "Please enter a received quantity of at least 1 for one or more items"
      );
      return;
    }

    setIsSubmitting(true);

    const res = await createGoodsReceiptAction({
      companyId,
      branchId: activePO.branchId || activeBranchId || warehouses[0]?.branchId,
      grnNumber,
      purchaseOrderId: activePO.id,
      warehouseId: selectedWarehouseId,
      receiptDate: new Date(receiptDate),
      notes: receiptNotes || undefined,
      items: itemsToReceive,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to process goods receipt note");
      return;
    }

    setIsCreateOpen(false);
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
            <span>Goods Receipts</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-muted-foreground text-sm">
            Receive incoming freight, record physical counts, and update
            inventory stock ledgers atomically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateDialog}
            disabled={approvedOrders.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Receive Delivery
          </Button>
        </div>
      </div>

      {approvedOrders.length === 0 && (
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            No approved purchase orders are currently open for delivery. Approve
            a purchase order first before recording incoming goods receipts.
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inbound GRNs
            </CardTitle>
            <PackageCheck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalGRNs}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Processed delivery dockets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Units Ingested
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalUnits.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Physical units posted to stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Target Depots</CardTitle>
            <WarehouseIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDepots}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Warehouses receiving stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Ingestion History</CardTitle>
          <CardDescription>
            Historical log of all confirmed dock deliveries and automatic stock
            ledger updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Purchase Order</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Target Warehouse</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Received Items</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No goods receipt notes recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((grn) => {
                    const totalQty = grn.items.reduce(
                      (s, it) => s + it.quantityReceived,
                      0
                    );
                    return (
                      <TableRow key={grn.id}>
                        <TableCell className="font-mono font-medium">
                          {grn.grnNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {grn.purchaseOrder.poNumber}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {grn.purchaseOrder.supplier.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="flex items-center gap-1">
                            <WarehouseIcon className="text-muted-foreground h-3 w-3" />
                            {grn.warehouse.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(grn.receiptDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {totalQty} unit{totalQty !== 1 ? "s" : ""} across{" "}
                          {grn.items.length} SKU
                          {grn.items.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {grn.receivedByUser.name}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-600 text-white">
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedReceipt(grn)}
                            title="View Receipt Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Process Goods Receipt Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <form onSubmit={handleCreateGRN}>
            <DialogHeader>
              <DialogTitle>Process Goods Receipt (GRN)</DialogTitle>
              <DialogDescription>
                Confirm physical receipt of goods against an approved purchase
                order. Stock levels will increment immediately.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="bg-destructive/15 text-destructive my-3 flex items-center gap-2 rounded p-3 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="poSelect">Approved Purchase Order *</Label>
                  <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                    <SelectTrigger id="poSelect">
                      <SelectValue placeholder="Select Purchase Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.poNumber} — {po.supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetWarehouse">Receiving Warehouse *</Label>
                  <Select
                    value={selectedWarehouseId}
                    onValueChange={setSelectedWarehouseId}
                  >
                    <SelectTrigger id="targetWarehouse">
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="grnNumber">GRN Number *</Label>
                  <Input
                    id="grnNumber"
                    value={grnNumber}
                    onChange={(e) => setGrnNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grnDate">Receipt Date *</Label>
                  <Input
                    id="grnDate"
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grnNotes">
                  Delivery Notes / Waybill Reference
                </Label>
                <Input
                  id="grnNotes"
                  placeholder="e.g. Carrier Waybill #88491, driver John Doe"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                />
              </div>

              {/* Items Ingestion Table */}
              {activePO && (
                <div className="space-y-2 border-t pt-2">
                  <Label className="text-sm font-semibold">
                    Incoming Item Quantities
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Specify the quantities physically inspected and verified at
                    the warehouse loading dock.
                  </p>

                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU & Item</TableHead>
                          <TableHead className="text-right text-xs">
                            Ordered
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            Received
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            Remaining
                          </TableHead>
                          <TableHead className="w-28 text-right text-xs">
                            Receive Now
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activePO.items.map((line) => {
                          const remaining = Math.max(
                            0,
                            line.quantityOrdered - line.quantityReceived
                          );
                          return (
                            <TableRow key={line.id}>
                              <TableCell className="text-xs">
                                <div className="font-medium">
                                  {line.item.name}
                                </div>
                                <div className="text-muted-foreground font-mono text-[10px]">
                                  {line.item.code}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {line.quantityOrdered} {line.item.uom}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {line.quantityReceived} {line.item.uom}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium text-amber-600">
                                {remaining} {line.item.uom}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  max={remaining}
                                  value={receivingQuantities[line.id] ?? 0}
                                  onChange={(e) => {
                                    const val = Math.min(
                                      remaining,
                                      Math.max(0, Number(e.target.value))
                                    );
                                    setReceivingQuantities((prev) => ({
                                      ...prev,
                                      [line.id]: val,
                                    }));
                                  }}
                                  className="h-8 text-right text-xs"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
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
                {isSubmitting ? "Ingesting Stock..." : "Confirm & Ingest Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View GRN Details Dialog */}
      <Dialog
        open={!!selectedReceipt}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
      >
        <DialogContent className="sm:max-w-[650px]">
          {selectedReceipt && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-mono text-xl font-bold">
                    {selectedReceipt.grnNumber}
                  </DialogTitle>
                  <Badge className="bg-emerald-600 text-white">Completed</Badge>
                </div>
                <DialogDescription>
                  Goods receipt against Purchase Order{" "}
                  {selectedReceipt.purchaseOrder.poNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="bg-muted/40 my-4 grid grid-cols-2 gap-4 rounded p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Receipt Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(selectedReceipt.receiptDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Target Warehouse:
                  </span>{" "}
                  <span className="font-medium">
                    {selectedReceipt.warehouse.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>{" "}
                  <span className="font-medium">
                    {selectedReceipt.purchaseOrder.supplier.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Received By:</span>{" "}
                  <span className="font-medium">
                    {selectedReceipt.receivedByUser.name}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Ingested Inventory Items
                </h4>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-right text-xs">
                          Quantity Ingested
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Unit Value
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReceipt.items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs">
                            {it.item.code}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.item.name}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            +{it.quantityReceived} {it.item.uom}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {(it.unitCost / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="bg-muted/20 mt-4 rounded border p-3 text-xs">
                  <span className="text-muted-foreground font-semibold">
                    Carrier Notes:
                  </span>
                  <p className="mt-1">{selectedReceipt.notes}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReceipt(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
