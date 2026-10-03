import { AppShell } from "@/components/layout/app-shell";
import {
  requireAuth,
  requirePermission,
  getActiveBranchId,
} from "@/lib/auth-helpers";
import { SecurityManager } from "@/components/admin/security-manager";

export const metadata = {
  title: "Security and Automated Operations | ERP",
};

export default async function AdminSecurityPage() {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");

  const activeBranchId = await getActiveBranchId();

  return (
    <AppShell currentBranchId={activeBranchId}>
      <SecurityManager />
    </AppShell>
  );
}
