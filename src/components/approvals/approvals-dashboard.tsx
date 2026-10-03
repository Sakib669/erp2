"use client";

import * as React from "react";
import {
  getPendingApprovalsAction,
  processApprovalAction,
} from "@/actions/approval-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  ApprovalRequest,
  ApprovalWorkflow,
  ApprovalStep,
  User,
  Role,
} from "@prisma/client";

type PendingRequest = ApprovalRequest & {
  workflow: ApprovalWorkflow;
  currentStep:
    | (ApprovalStep & { requiredRole: Role | null; requiredUser: User | null })
    | null;
  requestedByUser: User;
};

export function ApprovalsDashboard() {
  const [requests, setRequests] = React.useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingApprovalsAction();
      setRequests(data as PendingRequest[]);
    } catch {
      toast.error("Failed to load approvals");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (
    requestId: string,
    action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"
  ) => {
    const res = await processApprovalAction({ requestId, action });
    if (res.success) {
      toast.success(`Request ${action.toLowerCase()}`);
      fetchRequests();
    } else {
      toast.error(res.error || "Action failed");
    }
  };

  if (isLoading) {
    return <div>Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals Inbox</h1>
        <p className="text-muted-foreground">
          Review and act on pending requests
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">
            No pending approvals found. You&apos;re all caught up!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{req.entityType}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="mt-2 text-lg">
                  {req.workflow.name}
                </CardTitle>
                <CardDescription>
                  Requested by {req.requestedByUser.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-sm">
                  <span className="font-semibold">Entity ID:</span>{" "}
                  {req.entityId}
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAction(req.id, "REJECTED")}
                  >
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleAction(req.id, "APPROVED")}
                  >
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
