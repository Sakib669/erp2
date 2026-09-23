import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Building2, Database } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-6">
      <main className="w-full max-w-4xl space-y-8">
        <div className="space-y-3 text-center">
          <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
            Enterprise Architecture · Next.js 15 + Prisma + PostgreSQL
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Enterprise ERP System
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Multi branch operational foundation with strict tenant isolation,
            transactional audit logs, credentials with two factor
            authentication, and granular RBAC.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Multi Branch Isolation
              </CardTitle>
              <Building2 className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Tenant Safe</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Branch scoped data isolation and server side cookie validation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Identity & RBAC
              </CardTitle>
              <ShieldCheck className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Auth.js v5</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Credentials authentication, TOTP two factor protection, and
                audit logs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prisma PostgreSQL
              </CardTitle>
              <Database className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Relational Core</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Soft deletes, version tracking, and minor integer units for
                money.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <Button asChild size="lg">
            <Link href="/login">Access System</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="https://nextjs.org" target="_blank" rel="noreferrer">
              Documentation
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
