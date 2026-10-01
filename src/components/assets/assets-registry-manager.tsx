"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Eye } from "lucide-react";
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
import {
  getFixedAssetsAction,
  createFixedAssetAction,
} from "@/actions/asset-actions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FixedAsset } from "@prisma/client";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function AssetsRegistryManager({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [assets, setAssets] = React.useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    assetCode: "",
    name: "",
    description: "",
    category: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: "",
    usefulLifeYears: "",
    salvageValue: "",
  });

  const fetchAssets = React.useCallback(async () => {
    setIsLoading(true);
    const res = await getFixedAssetsAction(search);
    if (res.success && res.assets) {
      setAssets(res.assets);
    }
    setIsLoading(false);
  }, [search]);

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    const cost = Math.round(parseFloat(formData.purchaseCost) * 100);
    const salvage = Math.round(parseFloat(formData.salvageValue) * 100);

    if (
      isNaN(cost) ||
      isNaN(salvage) ||
      isNaN(parseInt(formData.usefulLifeYears))
    ) {
      toast.error("Invalid input");
      return;
    }

    const res = await createFixedAssetAction({
      branchId,
      assetCode: formData.assetCode,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      purchaseDate: new Date(formData.purchaseDate),
      purchaseCost: cost,
      salvageValue: salvage,
      usefulLifeYears: parseInt(formData.usefulLifeYears),
    });

    if (res.success) {
      toast.success("Asset registered");
      setIsAddOpen(false);
      fetchAssets();
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
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Asset Registry
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage fixed assets for this branch.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Register Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fixed Assets</CardTitle>
          <CardDescription>
            All physical assets and their book values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center">
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Purchase Cost</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      {asset.assetCode}
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>
                      {new Date(asset.purchaseDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(asset.purchaseCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(asset.currentBookValue)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          asset.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/assets/${asset.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Fixed Asset</DialogTitle>
            <DialogDescription>
              Add a new asset to the registry.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAsset} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Code</Label>
                <Input
                  required
                  value={formData.assetCode}
                  onChange={(e) =>
                    setFormData({ ...formData, assetCode: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Asset Name</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  required
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaseDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.purchaseCost}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaseCost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Useful Life (Years)</Label>
                <Input
                  type="number"
                  required
                  min="1"
                  value={formData.usefulLifeYears}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      usefulLifeYears: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Salvage Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.salvageValue}
                  onChange={(e) =>
                    setFormData({ ...formData, salvageValue: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Register Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
