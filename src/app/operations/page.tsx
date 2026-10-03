import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, getActiveBranchId } from "@/lib/auth-helpers";
import { OperationsDashboard } from "@/components/operations/operations-dashboard";

export const metadata = {
  title: "Branch Operations | ERP",
};

export default async function OperationsPage() {
  await requireAuth();
  const activeBranchId = await getActiveBranchId();

  return (
    <AppShell currentBranchId={activeBranchId}>
      <OperationsDashboard />
    </AppShell>
  );
}
