import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { ReportsManager } from "@/components/reporting/reports-manager";

export const metadata = {
  title: "Reports and Analytics | ERP",
};

export default async function ReportsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <ReportsManager />
    </AppShell>
  );
}
