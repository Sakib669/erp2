import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { DocumentsManager } from "@/components/operations/documents-manager";

export const metadata = {
  title: "Branch Documents | ERP",
};

export default async function DocumentsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <DocumentsManager />
    </AppShell>
  );
}
