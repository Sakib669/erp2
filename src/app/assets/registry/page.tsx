import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { AssetsRegistryManager } from "@/components/assets/assets-registry-manager";

export const metadata = {
  title: "Asset Registry | ERP",
};

export default async function AssetRegistryPage() {
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

  return (
    <AppShell currentBranchId={activeBranchId}>
      <AssetsRegistryManager branchId={activeBranchId} />
    </AppShell>
  );
}
