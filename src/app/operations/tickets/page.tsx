import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { TicketsManager } from "@/components/operations/tickets-manager";

export const metadata = {
  title: "Helpdesk Tickets | ERP",
};

export default async function TicketsPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <TicketsManager />
    </AppShell>
  );
}
