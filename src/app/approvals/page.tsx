import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { ApprovalsDashboard } from "@/components/approvals/approvals-dashboard";

export const metadata = {
  title: "Approvals | ERP",
};

export default async function ApprovalsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <ApprovalsDashboard />
    </AppShell>
  );
}
