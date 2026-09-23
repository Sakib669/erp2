"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export function DashboardInteractive() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [recordCode, setRecordCode] = React.useState("");

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setModalOpen(false);
    toast.success("Operational Voucher Created", {
      description: `Voucher record ${recordCode || "VCH-2026-001"} transactionally logged to audit trail.`,
    });
    setRecordCode("");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Toast triggers */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          toast.success("Audit Log Recorded", {
            description: "Branch transaction state snapshot saved to database.",
            icon: <CheckCircle2 className="text-success size-4" />,
          });
        }}
        className="gap-2 text-xs"
      >
        <Bell className="size-3.5" />
        Test Audit Toast
      </Button>

      {/* Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2 text-xs">
            <ShieldCheck className="size-3.5" />
            New Transaction
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateVoucher}>
            <DialogHeader>
              <DialogTitle>Create Transaction Voucher</DialogTitle>
              <DialogDescription>
                Post an audited entry to the current branch ledger. Idempotency
                and branch isolation will be strictly enforced.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right text-xs">
                  Voucher Code
                </Label>
                <Input
                  id="code"
                  placeholder="VCH-2026-881"
                  value={recordCode}
                  onChange={(e) => setRecordCode(e.target.value)}
                  className="col-span-3 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right text-xs">
                  Amount (cents)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  defaultValue="250000"
                  className="col-span-3 text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Commit Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog (Destructive confirmation) */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 gap-2 text-xs"
          >
            <AlertTriangle className="size-3.5" />
            Void Entry
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will soft delete the selected record and create a
              permanent reverse ledger journal in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.error("Voucher Voided", {
                  description:
                    "Reverse journal entry created and soft deleted.",
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
