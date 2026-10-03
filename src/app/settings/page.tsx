import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, getActiveBranchId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { SecurityManager } from "@/components/admin/security-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sliders, User, Lock } from "lucide-react";

export const metadata = {
  title: "Settings & Audit | ERP",
  description:
    "Enterprise system preferences, two factor security, and audit operations",
};

export default async function SettingsPage() {
  const user = await requireAuth();
  const activeBranchId = await getActiveBranchId();

  const [dbUser, dbBranches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    }),
    prisma.branch.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, isHeadquarters: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const branches =
    dbBranches.length > 0
      ? dbBranches
      : [
          {
            id: activeBranchId,
            name: "Headquarters",
            code: "HQ-01",
            isHeadquarters: true,
          },
        ];

  return (
    <AppShell
      user={user}
      branches={branches}
      currentBranchId={activeBranchId}
      title="Settings & Audit"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Settings & Security Operations
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your account security, two factor authentication, and system
            audit safeguards.
          </p>
        </div>

        <Tabs defaultValue="two-factor" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="two-factor" className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Two Factor
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Sliders className="size-4" />
              Audit & Ops
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="size-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="two-factor" className="mt-4">
            <TwoFactorSetup
              initialEnabled={dbUser?.twoFactorEnabled ?? false}
            />
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <SecurityManager />
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Profile</CardTitle>
                <CardDescription>
                  Your corporate identity and organizational credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Name
                    </span>
                    <p className="text-sm font-semibold">{user.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Email
                    </span>
                    <p className="text-sm font-semibold">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Account Status
                    </span>
                    <div>
                      <Badge
                        variant="outline"
                        className="text-success border-success/30 bg-success/10 text-xs"
                      >
                        {dbUser?.status || "ACTIVE"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Assigned Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
