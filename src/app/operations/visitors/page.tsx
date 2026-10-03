import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { VisitorsManager } from "@/components/operations/visitors-manager";

export const metadata = {
  title: "Visitor Reception | ERP",
};

export default async function VisitorsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <VisitorsManager />
    </AppShell>
  );
}
