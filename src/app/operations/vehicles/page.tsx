import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { VehiclesManager } from "@/components/operations/vehicles-manager";

export const metadata = {
  title: "Vehicle Reservations | ERP",
};

export default async function VehiclesPage() {
  await requireAuth();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <VehiclesManager />
    </AppShell>
  );
}
