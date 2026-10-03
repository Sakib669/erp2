"use client";

import * as React from "react";
import {
  getVisitorLogsAction,
  checkInVisitorAction,
  checkOutVisitorAction,
} from "@/actions/operations-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, LogOut } from "lucide-react";
import { toast } from "sonner";

type VisitorItem = Awaited<ReturnType<typeof getVisitorLogsAction>>[number];

export function VisitorsManager() {
  const [visitors, setVisitors] = React.useState<VisitorItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  const [visitorName, setVisitorName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [hostEmployeeId, setHostEmployeeId] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [badgeNumber, setBadgeNumber] = React.useState("");

  const fetchVisitors = async () => {
    setIsLoading(true);
    try {
      const data = await getVisitorLogsAction();
      setVisitors(data);
    } catch {
      toast.error("Failed to load visitor logs");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchVisitors();
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await checkInVisitorAction({
      visitorName,
      phone,
      hostEmployeeId,
      purpose,
      badgeNumber,
    });

    if (res.success) {
      toast.success("Visitor checked in successfully");
      setIsOpen(false);
      setVisitorName("");
      setPhone("");
      setHostEmployeeId("");
      setPurpose("");
      setBadgeNumber("");
      fetchVisitors();
    } else {
      toast.error(res.error || "Failed to check in visitor");
    }
  };

  const handleCheckOut = async (visitorLogId: string) => {
    const res = await checkOutVisitorAction({ visitorLogId });
    if (res.success) {
      toast.success("Visitor checked out");
      fetchVisitors();
    } else {
      toast.error(res.error || "Failed to check out visitor");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Visitor Reception
          </h1>
          <p className="text-muted-foreground">
            Reception desk visitor log, security badges, and checkout tracking
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Check In Visitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check In Visitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Visitor Name</label>
                <Input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  required
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact Phone Number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Host Employee ID</label>
                <Input
                  value={hostEmployeeId}
                  onChange={(e) => setHostEmployeeId(e.target.value)}
                  required
                  placeholder="Employee ID being visited"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose of Visit</label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  placeholder="Meeting, Delivery, Interview, etc."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Badge Number</label>
                <Input
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="Visitor badge tag"
                />
              </div>
              <Button type="submit" className="w-full">
                Complete Check In
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitor Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Host Employee</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitors.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No visitor records found
                  </TableCell>
                </TableRow>
              )}
              {visitors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.visitorName}</div>
                    <div className="text-muted-foreground text-xs">
                      {v.phone || "No phone"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.hostEmployee
                      ? `${v.hostEmployee.firstName} ${v.hostEmployee.lastName}`
                      : v.hostEmployeeId}
                  </TableCell>
                  <TableCell>{v.purpose}</TableCell>
                  <TableCell>{v.badgeNumber || "-"}</TableCell>
                  <TableCell>
                    {new Date(v.checkInTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {v.checkOutTime ? (
                      <Badge variant="secondary">Departed</Badge>
                    ) : (
                      <Badge className="bg-green-600">On Site</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!v.checkOutTime && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(v.id)}
                      >
                        <LogOut className="mr-1 h-3 w-3" /> Check Out
                      </Button>
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
