"use client";

import * as React from "react";
import {
  getSecurityOverviewAction,
  getDatabaseBackupsAction,
  triggerDatabaseBackupAction,
} from "@/actions/backup-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Lock,
  Server,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

type BackupItem = Awaited<ReturnType<typeof getDatabaseBackupsAction>>[number];

export function SecurityManager() {
  const [backups, setBackups] = React.useState<BackupItem[]>([]);
  const [securityStatus, setSecurityStatus] = React.useState<Record<
    string,
    string | boolean
  > | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [overview, backupList] = await Promise.all([
        getSecurityOverviewAction(),
        getDatabaseBackupsAction(),
      ]);

      if (overview.success && overview.data) {
        setSecurityStatus(overview.data.posture);
      }
      setBackups(backupList);
    } catch {
      toast.error("Failed to load security and backup status");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await triggerDatabaseBackupAction();
      if (res.success) {
        toast.success("Database backup snapshot generated successfully");
        fetchData();
      } else {
        toast.error("Failed to create database backup");
      }
    } catch {
      toast.error("An error occurred during backup creation");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Security and Automated Operations
          </h1>
          <p className="text-muted-foreground">
            HTTP defense posture, rate limiting shields, and disaster recovery
            backups
          </p>
        </div>
        <Button onClick={handleTriggerBackup} disabled={isBackingUp}>
          <Database className="mr-2 h-4 w-4" />
          {isBackingUp ? "Creating Snapshot..." : "Trigger Manual Backup"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              HTTP Defense Headers
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-muted-foreground pt-1 text-xs">
              CSP, HSTS, X-Frame-Options DENY, nosniff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Rate Limiting Protection
            </CardTitle>
            <Lock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Enforced</div>
            <p className="text-muted-foreground pt-1 text-xs">
              Sliding window limit active on public endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Disaster Recovery Snapshots
            </CardTitle>
            <Server className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {backups.length}
            </div>
            <p className="text-muted-foreground pt-1 text-xs">
              Verified with SHA256 integrity checksums
            </p>
          </CardContent>
        </Card>
      </div>

      {securityStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Security Configuration Directives</CardTitle>
            <CardDescription>
              Real time browser defense and protection policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(securityStatus).map(([directive, val]) => (
                <div
                  key={directive}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm font-medium">{directive}</span>
                  <Badge variant="outline">{String(val)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Database Backup Snapshots</CardTitle>
              <CardDescription>
                Historical backup snapshots with verifiable checksums
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>SHA256 Checksum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No backup snapshots created yet
                  </TableCell>
                </TableRow>
              )}
              {backups.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileCheck className="text-primary h-4 w-4" />
                      <span className="font-mono text-xs font-semibold">
                        {b.fileName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {(b.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {b.checksum.slice(0, 16)}...{b.checksum.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.status === "COMPLETED" ? "default" : "destructive"
                      }
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(b.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
