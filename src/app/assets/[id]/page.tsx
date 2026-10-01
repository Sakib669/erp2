import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { AssetDetailManager } from "@/components/assets/asset-detail-manager";
import { getFixedAssetDetailsAction } from "@/actions/asset-actions";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Asset Details | ERP",
};

export default async function AssetDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) return null;
  await requirePermission("ASSET_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return (
      <AppShell currentBranchId="">
        <div className="p-8">
          <p>Please select a branch.</p>
        </div>
      </AppShell>
    );
  }

  const { success, asset } = await getFixedAssetDetailsAction(params.id);

  if (!success || !asset) {
    notFound();
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <AssetDetailManager asset={asset} />
    </AppShell>
  );
}
