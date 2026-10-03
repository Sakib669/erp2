import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { SecurityManager } from "@/components/admin/security-manager";

export const metadata = {
  title: "Security and Automated Operations | ERP",
};

export default async function AdminSecurityPage() {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <SecurityManager />
    </AppShell>
  );
}
