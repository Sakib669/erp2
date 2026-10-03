import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, getActiveBranchId } from "@/lib/auth-helpers";
import { ReportsManager } from "@/components/reporting/reports-manager";

export const metadata = {
  title: "Reports and Analytics | ERP",
};

export default async function ReportsPage() {
  await requireAuth();
  const activeBranchId = await getActiveBranchId();

  return (
    <AppShell currentBranchId={activeBranchId}>
      <ReportsManager />
    </AppShell>
  );
}
