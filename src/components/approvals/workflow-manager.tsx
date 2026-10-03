"use client";

import * as React from "react";
import { getApprovalWorkflowsAction } from "@/actions/approval-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ListTree } from "lucide-react";
import { toast } from "sonner";

import { Prisma } from "@prisma/client";
type WorkflowWithRelations = Prisma.ApprovalWorkflowGetPayload<{
  include: { steps: true; branch: true };
}>;

export function WorkflowManager() {
  const [workflows, setWorkflows] = React.useState<WorkflowWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await getApprovalWorkflowsAction();
      setWorkflows(data);
    } catch {
      toast.error("Failed to load workflows");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Approval Workflows
          </h1>
          <p className="text-muted-foreground">
            Manage multi-tier approval hierarchies
          </p>
        </div>
        <Button onClick={() => toast.info("Builder UI coming soon...")}>
          <Plus className="mr-2 h-4 w-4" /> New Workflow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No workflows configured.
                  </TableCell>
                </TableRow>
              )}
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell className="font-medium">{wf.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{wf.entityType}</Badge>
                  </TableCell>
                  <TableCell>
                    {wf.branch ? wf.branch.name : "Global (All Branches)"}
                  </TableCell>
                  <TableCell>
                    <div className="text-muted-foreground flex items-center text-sm">
                      <ListTree className="mr-2 h-4 w-4" />
                      {wf.steps.length} tier{wf.steps.length !== 1 ? "s" : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {wf.isActive ? (
                      <Badge className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
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
