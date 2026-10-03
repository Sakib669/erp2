import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { OperationsDashboard } from "@/components/operations/operations-dashboard";

export const metadata = {
  title: "Branch Operations | ERP",
};

export default async function OperationsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <OperationsDashboard />
    </AppShell>
  );
}
