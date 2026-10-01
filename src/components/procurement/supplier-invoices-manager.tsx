"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
  AlertCircle,
  Building,
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
import { createSupplierInvoiceAction } from "@/actions/procurement-actions";
import { SupplierInvoiceStatus } from "@prisma/client";

interface PurchaseOrderOption {
  id: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  items: {
    id: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
  }[];
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
  paymentTermsDays: number;
}

interface SupplierInvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  dueDate: Date | string | null;
  totalAmount: number;
  status: SupplierInvoiceStatus;
  paymentTerms: string | null;
  notes: string | null;
  supplier: { id: string; name: string; code: string };
  purchaseOrder: { id: string; poNumber: string; totalAmount: number };
  goodsReceiptNote: { id: string; grnNumber: string } | null;
  createdByUser: { id: string; name: string };
}

interface SupplierInvoicesManagerProps {
  companyId: string;
  branchId: string;
  suppliers: SupplierOption[];
  orders: PurchaseOrderOption[];
  initialInvoices: SupplierInvoiceRow[];
}

export function SupplierInvoicesManager({
  companyId,
  branchId,
  suppliers,
  orders,
  initialInvoices,
}: SupplierInvoicesManagerProps) {
  const router = useRouter();
  const [invoices, setInvoices] =
    React.useState<SupplierInvoiceRow[]>(initialInvoices);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>(
    suppliers[0]?.id || ""
  );
  const [selectedPOId, setSelectedPOId] = React.useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = React.useState("");
  const [billedDollars, setBilledDollars] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("Net 30");
  const [notes, setNotes] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // View Details Modal
  const [selectedInvoice, setSelectedInvoice] =
    React.useState<SupplierInvoiceRow | null>(null);

  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Filter purchase orders available for the selected supplier
  const availableOrders = React.useMemo(() => {
    return orders.filter((o) => o.supplierId === selectedSupplierId);
  }, [orders, selectedSupplierId]);

  // Set default PO when supplier changes
  React.useEffect(() => {
    if (availableOrders.length > 0) {
      setSelectedPOId(availableOrders[0].id);
    } else {
      setSelectedPOId("");
    }
  }, [availableOrders]);

  // Active PO details for matching preview
  const activePO = React.useMemo(() => {
    return orders.find((o) => o.id === selectedPOId) || null;
  }, [orders, selectedPOId]);

  // Compute received value from active PO
  const poReceivedValue = React.useMemo(() => {
    if (!activePO) return 0;
    return activePO.items.reduce(
      (sum, it) => sum + it.quantityReceived * it.unitPrice,
      0
    );
  }, [activePO]);

  // Set default billed amount to PO received value when active PO changes
  React.useEffect(() => {
    if (poReceivedValue > 0) {
      setBilledDollars((poReceivedValue / 100).toFixed(2));
    }
  }, [poReceivedValue]);

  const billedCents = Math.round(Number(billedDollars || 0) * 100);
  const matchVarianceCents = billedCents - poReceivedValue;

  const filteredInvoices = React.useMemo(() => {
    if (statusFilter === "ALL") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Aggregate Metrics
  const metrics = React.useMemo(() => {
    let matchedCount = 0;
    let discrepancyCount = 0;
    let totalInvoicedCents = 0;

    for (const inv of invoices) {
      if (inv.status === SupplierInvoiceStatus.MATCHED) matchedCount++;
      if (inv.status === SupplierInvoiceStatus.DISCREPANCY) discrepancyCount++;
      totalInvoicedCents += inv.totalAmount;
    }

    return {
      total: invoices.length,
      matchedCount,
      discrepancyCount,
      totalInvoiced: (totalInvoicedCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    };
  }, [invoices]);

  const openCreateDialog = () => {
    setInvoiceNumber(
      `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`
    );
    setSelectedSupplierId(suppliers[0]?.id || "");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    const due = new Date();
    due.setDate(due.getDate() + (suppliers[0]?.paymentTermsDays || 30));
    setDueDate(due.toISOString().split("T")[0]);
    setNotes("");
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!selectedPOId) {
      setCreateError(
        "Please select an approved purchase order for three way matching"
      );
      return;
    }

    if (billedCents <= 0) {
      setCreateError("Total billed amount must be greater than zero");
      return;
    }

    setIsSubmitting(true);

    const res = await createSupplierInvoiceAction({
      companyId,
      branchId,
      supplierId: selectedSupplierId,
      purchaseOrderId: selectedPOId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      totalAmount: billedCents,
      paymentTerms,
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to record supplier invoice");
      return;
    }

    setIsCreateOpen(false);
    router.refresh();
  };

  const renderStatusBadge = (status: SupplierInvoiceStatus) => {
    switch (status) {
      case SupplierInvoiceStatus.MATCHED:
        return (
          <Badge className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            3-Way Matched
          </Badge>
        );
      case SupplierInvoiceStatus.DISCREPANCY:
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Discrepancy
          </Badge>
        );
      case SupplierInvoiceStatus.PENDING_MATCH:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Pending Match
          </Badge>
        );
      case SupplierInvoiceStatus.PAID:
        return <Badge variant="secondary">Paid</Badge>;
      case SupplierInvoiceStatus.CANCELLED:
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            <span>Supplier Invoices</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Supplier Invoices & 3-Way Matching
          </h1>
          <p className="text-muted-foreground text-sm">
            Verify vendor invoices against purchase orders and received goods to
            prevent overbilling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateDialog}
            disabled={suppliers.length === 0 || orders.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Record Invoice
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <Receipt className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Processed vendor bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">3-Way Matched</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {metrics.matchedCount}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Cleared for AP disbursement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <AlertTriangle className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">
              {metrics.discrepancyCount}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Require price / quantity audit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <Building className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInvoiced}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Payable ledger volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Invoices Ledger</CardTitle>
              <CardDescription>
                Audited supplier bills with automatic three way matching status.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={SupplierInvoiceStatus.MATCHED}>
                  Matched
                </SelectItem>
                <SelectItem value={SupplierInvoiceStatus.DISCREPANCY}>
                  Discrepancy
                </SelectItem>
                <SelectItem value={SupplierInvoiceStatus.PENDING_MATCH}>
                  Pending Match
                </SelectItem>
                <SelectItem value={SupplierInvoiceStatus.PAID}>Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Purchase Order</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No supplier invoices match the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const totalFormatted = (
                      inv.totalAmount / 100
                    ).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    });

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {inv.supplier.name}
                          </div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            {inv.supplier.code}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {inv.purchaseOrder.poNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {totalFormatted}
                        </TableCell>
                        <TableCell>{renderStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Invoice Audit"
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

      {/* Record Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <DialogTitle>Record Supplier Invoice</DialogTitle>
              <DialogDescription>
                Enter the vendor bill and evaluate automated three way matching
                against purchase order lines and received goods.
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
                  <Label htmlFor="invSupplier">Vendor / Supplier *</Label>
                  <Select
                    value={selectedSupplierId}
                    onValueChange={(val) => setSelectedSupplierId(val)}
                  >
                    <SelectTrigger id="invSupplier">
                      <SelectValue />
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

                <div className="space-y-1.5">
                  <Label htmlFor="invPO">Linked Purchase Order *</Label>
                  <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                    <SelectTrigger id="invPO">
                      <SelectValue placeholder="Select PO" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrders.length === 0 ? (
                        <SelectItem value="NONE" disabled>
                          No POs for this supplier
                        </SelectItem>
                      ) : (
                        availableOrders.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.poNumber} —{" "}
                            {(o.totalAmount / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                            })}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invNum">Invoice # *</Label>
                  <Input
                    id="invNum"
                    placeholder="e.g. INV-9901"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invDate">Invoice Date *</Label>
                  <Input
                    id="invDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Payment Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="billedAmt">Total Invoiced Amount ($) *</Label>
                  <Input
                    id="billedAmt"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={billedDollars}
                    onChange={(e) => setBilledDollars(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="terms">Agreed Payment Terms</Label>
                  <Input
                    id="terms"
                    placeholder="Net 30 Days"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invNotes">Audit Notes</Label>
                <Input
                  id="invNotes"
                  placeholder="Optional billing remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Three-Way Matching Real Time Preview */}
              {activePO && (
                <div className="bg-muted/40 space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Automated 3-Way Match Verification</span>
                    {matchVarianceCents === 0 && poReceivedValue > 0 ? (
                      <Badge className="bg-emerald-600 text-white">
                        MATCH VERIFIED
                      </Badge>
                    ) : (
                      <Badge variant="destructive">DISCREPANCY FLAGGED</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        Order Authorized:
                      </span>
                      <div className="mt-0.5 font-medium">
                        {(activePO.totalAmount / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Goods Received Value:
                      </span>
                      <div className="mt-0.5 font-medium text-blue-600">
                        {(poReceivedValue / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Billed Variance:
                      </span>
                      <div
                        className={`mt-0.5 font-bold ${
                          matchVarianceCents === 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        }`}
                      >
                        {(matchVarianceCents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </div>
                    </div>
                  </div>

                  {matchVarianceCents !== 0 && (
                    <p className="text-destructive mt-1 text-[11px]">
                      Billed amount does not match the exact received goods
                      valuation. This invoice will be marked as DISCREPANCY for
                      manual accounts payable review.
                    </p>
                  )}
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
                {isSubmitting ? "Processing..." : "Confirm & Match Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Audit Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          {selectedInvoice && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-mono text-xl font-bold">
                    {selectedInvoice.invoiceNumber}
                  </DialogTitle>
                  {renderStatusBadge(selectedInvoice.status)}
                </div>
                <DialogDescription>
                  Billed by {selectedInvoice.supplier.name} against PO{" "}
                  {selectedInvoice.purchaseOrder.poNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="bg-muted/40 my-4 space-y-3 rounded p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier Code:</span>
                  <span className="font-mono font-medium">
                    {selectedInvoice.supplier.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <span className="font-medium">
                    {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Due:</span>
                  <span className="font-medium">
                    {selectedInvoice.dueDate
                      ? new Date(selectedInvoice.dueDate).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terms:</span>
                  <span className="font-medium">
                    {selectedInvoice.paymentTerms || "Standard"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-semibold">
                    Total Invoiced Amount:
                  </span>
                  <span className="text-primary text-base font-bold">
                    {(selectedInvoice.totalAmount / 100).toLocaleString(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD",
                      }
                    )}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="bg-muted/20 rounded border p-3 text-xs">
                  <span className="text-muted-foreground font-semibold">
                    Remarks:
                  </span>
                  <p className="mt-1">{selectedInvoice.notes}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
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
