import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardInteractive } from "@/components/dashboard/dashboard-interactive";
import {
  Building2,
  ShieldCheck,
  Database,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Activity,
} from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Retrieve branches from database or provide demo fallback
  const dbBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, isHeadquarters: true },
    orderBy: { createdAt: "asc" },
  });

  const branches =
    dbBranches.length > 0
      ? dbBranches
      : [
          {
            id: "na-hq",
            name: "North America HQ",
            code: "NA-HQ",
            isHeadquarters: true,
          },
          {
            id: "apac-01",
            name: "Asia Pacific Regional",
            code: "APAC-01",
            isHeadquarters: false,
          },
          {
            id: "eu-01",
            name: "European Operations",
            code: "EU-01",
            isHeadquarters: false,
          },
        ];

  const currentBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0];

  return (
    <AppShell
      user={user}
      branches={branches}
      currentBranchId={currentBranch.id}
      title="Enterprise Operations Center"
    >
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="border-border flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                Branch Operations Overview
              </h1>
              <Badge variant="outline" className="text-xs font-semibold">
                {currentBranch.code}
              </Badge>
              {currentBranch.isHeadquarters && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  Headquarters
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Active branch context:{" "}
              <span className="text-foreground font-semibold">
                {currentBranch.name}
              </span>
              . All queries and transactions are strictly isolated.
            </p>
          </div>

          <DashboardInteractive />
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Branch Multi-Tenancy
              </CardTitle>
              <Building2 className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-xl font-bold">
                {currentBranch.name}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
                <span className="text-success flex items-center font-medium">
                  <TrendingUp className="mr-0.5 size-3" /> Isolated
                </span>{" "}
                via branchId scope
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Identity & Access
              </CardTitle>
              <ShieldCheck className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-xl font-bold">
                {user ? user.name : "Protected"}
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {user?.roles?.[0] || "SUPER_ADMIN"} · 2FA TOTP Enforced
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Audit Trail Engine
              </CardTitle>
              <Activity className="text-success size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-xl font-bold">
                100% Tracked
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Transactional diffs on all mutations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Database & Schema
              </CardTitle>
              <Database className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-xl font-bold">
                PostgreSQL 16
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Prisma ORM · Soft Deletes Active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="overview" className="text-xs">
              Live Ledger Sample
            </TabsTrigger>
            <TabsTrigger value="departments" className="text-xs">
              Branch Departments
            </TabsTrigger>
            <TabsTrigger value="architecture" className="text-xs">
              Architecture Invariants
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Ledger Table with Tabular Numbers */}
          <TabsContent value="overview" className="space-y-4 pt-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Sample Transaction Ledger
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Financial records stored as minor integer units with
                      tabular lining numerals.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    UTC Timestamps
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Voucher #</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit ($)</TableHead>
                      <TableHead className="text-right">Credit ($)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        code: "VCH-2026-001",
                        account: "1010 Operating Cash Account",
                        type: "Cash Receipt",
                        debit: "$12,450.00",
                        credit: "-",
                        status: "POSTED",
                        badge: "bg-success/20 text-success border-success/30",
                      },
                      {
                        code: "VCH-2026-002",
                        account: "2010 Accounts Payable Vendor",
                        type: "Supplier Payment",
                        debit: "-",
                        credit: "$4,120.50",
                        status: "POSTED",
                        badge: "bg-success/20 text-success border-success/30",
                      },
                      {
                        code: "VCH-2026-003",
                        account: "5010 Branch Payroll Clearing",
                        type: "Payroll Run",
                        debit: "$38,900.00",
                        credit: "-",
                        status: "RECONCILED",
                        badge: "bg-primary/20 text-primary border-primary/30",
                      },
                      {
                        code: "VCH-2026-004",
                        account: "1510 Inventory Stock In Transit",
                        type: "Goods Received Note",
                        debit: "$8,750.25",
                        credit: "-",
                        status: "PENDING",
                        badge: "bg-warning/20 text-warning border-warning/30",
                      },
                    ].map((row) => (
                      <TableRow key={row.code}>
                        <TableCell className="text-foreground font-mono text-xs font-medium">
                          {row.code}
                        </TableCell>
                        <TableCell className="text-xs">{row.account}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.type}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          {row.debit}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          {row.credit}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${row.badge}`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            className="text-primary inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
                          >
                            Inspect <ArrowUpRight className="size-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Branch Departments */}
          <TabsContent value="departments" className="space-y-4 pt-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Hierarchical Department Tree
                </CardTitle>
                <CardDescription className="text-xs">
                  Departments scoped to active branch ({currentBranch.name})
                  with parent and child relationships.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      name: "Executive & Administration",
                      code: "EXEC",
                      subs: ["Compliance", "Legal"],
                    },
                    {
                      name: "Engineering & IT",
                      code: "ENG",
                      subs: ["Platform Operations", "Security"],
                    },
                    {
                      name: "Finance & Accounting",
                      code: "FIN",
                      subs: ["Accounts Payable", "Audit & Tax"],
                    },
                  ].map((dept) => (
                    <div
                      key={dept.code}
                      className="border-border bg-card space-y-2 rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground text-xs font-semibold">
                          {dept.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {dept.code}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground space-y-1 text-[11px]">
                        <span className="text-muted-foreground/70 text-[10px] font-medium uppercase">
                          Sub-units:
                        </span>
                        {dept.subs.map((s) => (
                          <div
                            key={s}
                            className="flex items-center gap-1.5 pl-2"
                          >
                            <span className="bg-primary size-1 rounded-full" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Architecture Invariants */}
          <TabsContent value="architecture" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                    <FileText className="text-primary size-3.5" /> Multi-Tenancy
                    Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-xs">
                  <p>
                    • Shared schema with automated{" "}
                    <code className="text-foreground font-mono">branchId</code>{" "}
                    query injection.
                  </p>
                  <p>
                    • Unauthorized cross-branch access immediately triggers 404
                    and writes{" "}
                    <code className="text-destructive font-mono">
                      BRANCH_ACCESS_DENIED
                    </code>{" "}
                    audit event.
                  </p>
                  <p>
                    • Soft deletes enforce{" "}
                    <code className="text-foreground font-mono">
                      deletedAt IS NULL
                    </code>{" "}
                    on all domain reads.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                    <ShieldCheck className="text-primary size-3.5" /> UI &
                    Accessibility Standards
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-xs">
                  <p>
                    • WCAG 2.1 AA compliant OKLCH colors across light and dark
                    modes.
                  </p>
                  <p>
                    • Windows High Contrast Mode enabled via fallback outlines
                    on interactive focus rings.
                  </p>
                  <p>
                    • Compact enterprise density: 36px inputs, 40px table rows,
                    tabular figures for currency.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
