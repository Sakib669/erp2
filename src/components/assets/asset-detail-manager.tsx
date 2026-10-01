"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
import {
  runDepreciationAction,
  disposeAssetAction,
} from "@/actions/asset-actions";
import { getAccountsAction } from "@/actions/account-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FixedAsset, AssetDepreciation, Account } from "@prisma/client";

type AssetWithDepreciations = FixedAsset & {
  depreciations: AssetDepreciation[];
};

export function AssetDetailManager({
  asset,
}: {
  asset: AssetWithDepreciations;
}) {
  const router = useRouter();

  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const [isDepreciateOpen, setIsDepreciateOpen] = React.useState(false);
  const [depreciateData, setDepreciateData] = React.useState({
    periodEndDate: new Date().toISOString().split("T")[0],
    expenseAccountId: "",
    accumulatedAccountId: "",
  });

  const [isDisposeOpen, setIsDisposeOpen] = React.useState(false);
  const [disposeData, setDisposeData] = React.useState({
    disposalAmount: "0",
    cashAccountId: "",
    fixedAssetAccountId: "",
    accumulatedAccountId: "",
    lossAccountId: "",
    gainAccountId: "",
  });

  React.useEffect(() => {
    getAccountsAction(asset.companyId).then((res) => {
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
      }
    });
  }, [asset.companyId]);

  async function handleDepreciate(e: React.FormEvent) {
    e.preventDefault();
    const res = await runDepreciationAction({
      assetId: asset.id,
      periodEndDate: new Date(depreciateData.periodEndDate),
      depreciationExpenseAccountId: depreciateData.expenseAccountId,
      accumulatedDepreciationAccountId: depreciateData.accumulatedAccountId,
    });

    if (res.success) {
      toast.success("Depreciation recorded");
      setIsDepreciateOpen(false);
      router.refresh();
    } else {
      toast.error("Error", { description: res.error });
    }
  }

  async function handleDispose(e: React.FormEvent) {
    e.preventDefault();
    const amount = Math.round(parseFloat(disposeData.disposalAmount) * 100);
    if (isNaN(amount)) return;

    const res = await disposeAssetAction({
      assetId: asset.id,
      disposalAmount: amount,
      fixedAssetAccountId: disposeData.fixedAssetAccountId,
      cashAccountId: disposeData.cashAccountId,
      accumulatedDepreciationAccountId: disposeData.accumulatedAccountId,
      lossOnDisposalAccountId: disposeData.lossAccountId,
      gainOnDisposalAccountId: disposeData.gainAccountId,
    });

    if (res.success) {
      toast.success("Asset disposed");
      setIsDisposeOpen(false);
      router.refresh();
    } else {
      toast.error("Error", { description: res.error });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/assets/registry">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
            <p className="text-muted-foreground mt-2">
              {asset.assetCode} • {asset.category}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {asset.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsDepreciateOpen(true)}
              >
                <Calendar className="mr-2 h-4 w-4" /> Run Depreciation
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDisposeOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Dispose Asset
              </Button>
            </>
          )}
          {asset.status === "DISPOSED" && (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              Disposed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Purchase Date
                </p>
                <p>{new Date(asset.purchaseDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Purchase Cost
                </p>
                <p>{formatCurrency(asset.purchaseCost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Useful Life
                </p>
                <p>{asset.usefulLifeYears} Years</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Salvage Value
                </p>
                <p>{formatCurrency(asset.salvageValue)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Current Book Value
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(asset.currentBookValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Depreciation History</CardTitle>
            <CardDescription>
              All posted depreciation runs for this asset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {asset.depreciations?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No depreciation runs yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period End</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Book Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asset.depreciations.map((dep: AssetDepreciation) => (
                    <TableRow key={dep.id}>
                      <TableCell>
                        {new Date(dep.periodEndDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dep.depreciationAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dep.bookValueAfter)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDepreciateOpen} onOpenChange={setIsDepreciateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Depreciation</DialogTitle>
            <DialogDescription>
              Calculate and post straight-line depreciation to the ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDepreciate} className="space-y-4">
            <div className="space-y-2">
              <Label>Period End Date</Label>
              <Input
                type="date"
                required
                value={depreciateData.periodEndDate}
                onChange={(e) =>
                  setDepreciateData({
                    ...depreciateData,
                    periodEndDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Expense Account</Label>
              <Select
                required
                value={depreciateData.expenseAccountId}
                onValueChange={(val) =>
                  setDepreciateData({
                    ...depreciateData,
                    expenseAccountId: val,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accumulated Depreciation Account</Label>
              <Select
                required
                value={depreciateData.accumulatedAccountId}
                onValueChange={(val) =>
                  setDepreciateData({
                    ...depreciateData,
                    accumulatedAccountId: val,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDepreciateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Run Depreciation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDisposeOpen} onOpenChange={setIsDisposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose Asset</DialogTitle>
            <DialogDescription>
              Record the disposal, write off the asset, and realize gain/loss.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDispose} className="space-y-4">
            <div className="space-y-2">
              <Label>Disposal Amount (Cash Received)</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={disposeData.disposalAmount}
                onChange={(e) =>
                  setDisposeData({
                    ...disposeData,
                    disposalAmount: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Fixed Asset Account (To credit original cost)</Label>
                <Select
                  required
                  onValueChange={(val) =>
                    setDisposeData({ ...disposeData, fixedAssetAccountId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Accumulated Depreciation Account</Label>
                <Select
                  required
                  onValueChange={(val) =>
                    setDisposeData({
                      ...disposeData,
                      accumulatedAccountId: val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Cash Account</Label>
                <Select
                  required
                  onValueChange={(val) =>
                    setDisposeData({ ...disposeData, cashAccountId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Gain on Disposal Account</Label>
                <Select
                  required
                  onValueChange={(val) =>
                    setDisposeData({ ...disposeData, gainAccountId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Loss on Disposal Account</Label>
                <Select
                  required
                  onValueChange={(val) =>
                    setDisposeData({ ...disposeData, lossAccountId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisposeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Confirm Disposal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
