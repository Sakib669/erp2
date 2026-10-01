"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Truck,
  Eye,
  AlertCircle,
  Building,
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
  createPurchaseOrderAction,
  updatePurchaseOrderStatusAction,
} from "@/actions/procurement-actions";
import { PurchaseOrderStatus } from "@prisma/client";

interface ItemOption {
  id: string;
  code: string;
  name: string;
  uom: string;
  costPrice: number;
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrderRow {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: Date | string;
  expectedDeliveryDate: Date | string | null;
  totalAmount: number;
  notes: string | null;
  supplier: { id: string; name: string; code: string };
  branch: { id: string; name: string; code: string };
  items: {
    id: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    lineTotal: number;
    notes: string | null;
    item: { id: string; name: string; code: string; uom: string };
  }[];
  _count?: { goodsReceiptNotes: number; supplierInvoices: number };
}

interface PurchaseOrdersManagerProps {
  companyId: string;
  branches: BranchOption[];
  suppliers: SupplierOption[];
  catalogItems: ItemOption[];
  initialOrders: PurchaseOrderRow[];
  activeBranchId?: string;
  isSuperAdmin: boolean;
}

export function PurchaseOrdersManager({
  companyId,
  branches,
  suppliers,
  catalogItems,
  initialOrders,
  activeBranchId,
  isSuperAdmin,
}: PurchaseOrdersManagerProps) {
  const router = useRouter();
  const [orders, setOrders] = React.useState<PurchaseOrderRow[]>(initialOrders);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [branchFilter, setBranchFilter] = React.useState<string>(
    activeBranchId && !isSuperAdmin ? activeBranchId : "ALL"
  );

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [targetBranchId, setTargetBranchId] = React.useState<string>(
    activeBranchId || branches[0]?.id || ""
  );
  const [targetSupplierId, setTargetSupplierId] = React.useState<string>(
    suppliers[0]?.id || ""
  );
  const [poNumber, setPoNumber] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lineItems, setLineItems] = React.useState<
    { itemId: string; quantity: number; unitPrice: number; notes: string }[]
  >([]);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // View Details Modal
  const [selectedOrder, setSelectedOrder] =
    React.useState<PurchaseOrderRow | null>(null);

  // Status Action Modal State
  const [statusError, setStatusError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (branchFilter !== "ALL" && o.branch.id !== branchFilter) return false;
      return true;
    });
  }, [orders, statusFilter, branchFilter]);

  // Aggregate Metrics
  const metrics = React.useMemo(() => {
    let pendingApproval = 0;
    let openCount = 0;
    let totalSpend = 0;

    for (const o of orders) {
      if (o.status === PurchaseOrderStatus.SUBMITTED) pendingApproval++;
      if (
        o.status === PurchaseOrderStatus.APPROVED ||
        o.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
      ) {
        openCount++;
      }
      totalSpend += o.totalAmount;
    }

    return {
      total: orders.length,
      pendingApproval,
      openCount,
      totalSpend: (totalSpend / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    };
  }, [orders]);

  const addLineItem = () => {
    const defaultItem = catalogItems[0];
    if (!defaultItem) return;
    setLineItems((prev) => [
      ...prev,
      {
        itemId: defaultItem.id,
        quantity: 1,
        unitPrice: defaultItem.costPrice,
        notes: "",
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    field: "itemId" | "quantity" | "unitPrice" | "notes",
    value: string | number
  ) => {
    setLineItems((prev) => {
      const copy = [...prev];
      if (field === "itemId") {
        const selected = catalogItems.find((it) => it.id === value);
        copy[index] = {
          ...copy[index],
          itemId: String(value),
          unitPrice: selected ? selected.costPrice : copy[index].unitPrice,
        };
      } else if (field === "quantity") {
        copy[index] = { ...copy[index], quantity: Math.max(1, Number(value)) };
      } else if (field === "unitPrice") {
        copy[index] = { ...copy[index], unitPrice: Math.max(0, Number(value)) };
      } else if (field === "notes") {
        copy[index] = { ...copy[index], notes: String(value) };
      }
      return copy;
    });
  };

  const openCreateDialog = () => {
    setPoNumber(
      `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`
    );
    setTargetBranchId(activeBranchId || branches[0]?.id || "");
    setTargetSupplierId(suppliers[0]?.id || "");
    setDeliveryDate("");
    setNotes("");
    if (catalogItems[0]) {
      setLineItems([
        {
          itemId: catalogItems[0].id,
          quantity: 10,
          unitPrice: catalogItems[0].costPrice,
          notes: "",
        },
      ]);
    } else {
      setLineItems([]);
    }
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (lineItems.length === 0) {
      setCreateError("Please add at least one line item to the purchase order");
      return;
    }

    setIsSubmitting(true);

    const res = await createPurchaseOrderAction({
      companyId,
      branchId: targetBranchId,
      poNumber,
      supplierId: targetSupplierId,
      expectedDeliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      notes: notes || undefined,
      items: lineItems.map((li) => ({
        itemId: li.itemId,
        quantityOrdered: li.quantity,
        unitPrice: li.unitPrice,
        notes: li.notes || undefined,
      })),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to create purchase order");
      return;
    }

    setIsCreateOpen(false);
    router.refresh();
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: PurchaseOrderStatus
  ) => {
    setStatusError(null);
    setIsSubmitting(true);

    const res = await updatePurchaseOrderStatusAction({
      purchaseOrderId: orderId,
      status: newStatus,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setStatusError(res.error || "Failed to update order status");
      return;
    }

    if (selectedOrder && selectedOrder.id === orderId && res.purchaseOrder) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    }

    router.refresh();
  };

  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT:
        return <Badge variant="secondary">Draft</Badge>;
      case PurchaseOrderStatus.SUBMITTED:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Awaiting Approval
          </Badge>
        );
      case PurchaseOrderStatus.APPROVED:
        return (
          <Badge className="bg-blue-600 text-white hover:bg-blue-700">
            Approved
          </Badge>
        );
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return (
          <Badge className="bg-purple-600 text-white hover:bg-purple-700">
            Partial Receipt
          </Badge>
        );
      case PurchaseOrderStatus.RECEIVED:
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            Fully Received
          </Badge>
        );
      case PurchaseOrderStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentOrderTotal = React.useMemo(() => {
    const totalCents = lineItems.reduce(
      (sum, li) => sum + li.quantity * li.unitPrice,
      0
    );
    return (totalCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }, [lineItems]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
            <span>Purchase Orders</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">
            Create, approve, and track purchase orders with vendor item lines
            and fulfillment statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {statusError && (
        <div className="bg-destructive/15 text-destructive flex items-center gap-2 rounded p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              All registered orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {metrics.pendingApproval}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Submitted for management signoff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              In Fulfillment
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.openCount}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Approved & awaiting delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Commitment
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSpend}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Cumulative purchase value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Purchase Order Ledger</CardTitle>
              <CardDescription>
                Review procurement orders, approvals, and fulfillment
                milestones.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value={PurchaseOrderStatus.DRAFT}>
                    Draft
                  </SelectItem>
                  <SelectItem value={PurchaseOrderStatus.SUBMITTED}>
                    Submitted
                  </SelectItem>
                  <SelectItem value={PurchaseOrderStatus.APPROVED}>
                    Approved
                  </SelectItem>
                  <SelectItem value={PurchaseOrderStatus.PARTIALLY_RECEIVED}>
                    Partial Receipt
                  </SelectItem>
                  <SelectItem value={PurchaseOrderStatus.RECEIVED}>
                    Fully Received
                  </SelectItem>
                  <SelectItem value={PurchaseOrderStatus.CANCELLED}>
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>

              {isSuperAdmin && (
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Filter by branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No purchase orders match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const totalFormatted = (
                      order.totalAmount / 100
                    ).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    });
                    const dateFormatted = new Date(
                      order.orderDate
                    ).toLocaleDateString();

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.poNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {order.supplier.name}
                          </div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {order.supplier.code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="flex items-center gap-1">
                            <Building className="text-muted-foreground h-3 w-3" />
                            {order.branch.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {dateFormatted}
                        </TableCell>
                        <TableCell className="text-xs">
                          {order.items.length} SKU
                          {order.items.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {totalFormatted}
                        </TableCell>
                        <TableCell>{renderStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                              title="View Order Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {order.status === PurchaseOrderStatus.DRAFT && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(
                                    order.id,
                                    PurchaseOrderStatus.SUBMITTED
                                  )
                                }
                                title="Submit for Approval"
                                className="gap-1 text-xs"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Submit
                              </Button>
                            )}

                            {order.status === PurchaseOrderStatus.SUBMITTED && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(
                                    order.id,
                                    PurchaseOrderStatus.APPROVED
                                  )
                                }
                                title="Approve Order"
                                className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                            )}

                            {(order.status === PurchaseOrderStatus.DRAFT ||
                              order.status ===
                                PurchaseOrderStatus.SUBMITTED) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleStatusChange(
                                    order.id,
                                    PurchaseOrderStatus.CANCELLED
                                  )
                                }
                                title="Cancel Order"
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Initiate a formal commercial purchase requisition with supplier
                line items.
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
                  <Label htmlFor="branch">Operating Branch *</Label>
                  <Select
                    value={targetBranchId}
                    onValueChange={setTargetBranchId}
                  >
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Select Branch" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="supplier">Vendor / Supplier *</Label>
                  <Select
                    value={targetSupplierId}
                    onValueChange={setTargetSupplierId}
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="poNumber">PO Number *</Label>
                  <Input
                    id="poNumber"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Procurement Terms</Label>
                <Input
                  id="notes"
                  placeholder="Optional delivery instructions or vendor reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Ordered Line Items
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add Line Item
                  </Button>
                </div>

                {lineItems.length === 0 ? (
                  <p className="text-muted-foreground py-2 text-center text-xs">
                    No items added yet. Click &quot;Add Line Item&quot; to
                    specify materials.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lineItems.map((line, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/30 grid grid-cols-12 items-center gap-2 rounded border p-2 text-xs"
                      >
                        <div className="col-span-5 space-y-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Item SKU
                          </Label>
                          <Select
                            value={line.itemId}
                            onValueChange={(val) =>
                              updateLineItem(idx, "itemId", val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogItems.map((it) => (
                                <SelectItem key={it.id} value={it.id}>
                                  {it.code} — {it.name} ({it.uom})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Qty
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                idx,
                                "quantity",
                                Number(e.target.value)
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Unit Cost ($)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={(line.unitPrice / 100).toFixed(2)}
                            onChange={(e) =>
                              updateLineItem(
                                idx,
                                "unitPrice",
                                Math.round(Number(e.target.value) * 100)
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="text-muted-foreground text-[10px]">
                            Line Total
                          </div>
                          <div className="mt-1 font-semibold">
                            {(
                              (line.quantity * line.unitPrice) /
                              100
                            ).toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })}
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(idx)}
                            className="text-destructive h-7 w-7"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">
                    Estimated Total Commitment:
                  </span>
                  <span className="text-primary text-lg font-bold">
                    {currentOrderTotal}
                  </span>
                </div>
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
                {isSubmitting ? "Submitting..." : "Save Purchase Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          {selectedOrder && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-mono text-xl font-bold">
                    {selectedOrder.poNumber}
                  </DialogTitle>
                  {renderStatusBadge(selectedOrder.status)}
                </div>
                <DialogDescription>
                  Requisition issued to {selectedOrder.supplier.name} (
                  {selectedOrder.supplier.code})
                </DialogDescription>
              </DialogHeader>

              <div className="bg-muted/40 my-4 grid grid-cols-2 gap-4 rounded p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Order Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(selectedOrder.orderDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Expected Delivery:
                  </span>{" "}
                  <span className="font-medium">
                    {selectedOrder.expectedDeliveryDate
                      ? new Date(
                          selectedOrder.expectedDeliveryDate
                        ).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Receiving Branch:
                  </span>{" "}
                  <span className="font-medium">
                    {selectedOrder.branch.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total Valuation:
                  </span>{" "}
                  <span className="text-primary font-bold">
                    {(selectedOrder.totalAmount / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Itemized Purchase Lines
                </h4>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">
                          Item Description
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Ordered
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Received
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs">
                            {it.item.code}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.item.name}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {it.quantityOrdered} {it.item.uom}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            <span
                              className={
                                it.quantityReceived >= it.quantityOrdered
                                  ? "text-emerald-600"
                                  : it.quantityReceived > 0
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                              }
                            >
                              {it.quantityReceived} {it.item.uom}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {(it.unitPrice / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {(it.lineTotal / 100).toLocaleString("en-US", {
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

              {selectedOrder.notes && (
                <div className="bg-muted/20 mt-4 rounded border p-3 text-xs">
                  <span className="text-muted-foreground font-semibold">
                    Notes / Instructions:
                  </span>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
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
