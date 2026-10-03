"use client";

import * as React from "react";
import {
  getHelpdeskTicketsAction,
  createHelpdeskTicketAction,
  updateHelpdeskTicketStatusAction,
} from "@/actions/operations-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TicketPriority, TicketStatus } from "@prisma/client";

type TicketItem = Awaited<ReturnType<typeof getHelpdeskTicketsAction>>[number];

export function TicketsManager() {
  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("IT");
  const [priority, setPriority] = React.useState<TicketPriority>(
    TicketPriority.MEDIUM
  );

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await getHelpdeskTicketsAction();
      setTickets(data);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createHelpdeskTicketAction({
      title,
      description,
      category,
      priority,
    });

    if (res.success) {
      toast.success("Helpdesk ticket filed successfully");
      setIsOpen(false);
      setTitle("");
      setDescription("");
      fetchTickets();
    } else {
      toast.error(res.error || "Failed to create ticket");
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    const res = await updateHelpdeskTicketStatusAction({ ticketId, status });
    if (res.success) {
      toast.success("Ticket status updated");
      fetchTickets();
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Helpdesk Tickets
          </h1>
          <p className="text-muted-foreground">
            Internal support tickets and operational request tracking
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>File a Helpdesk Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Brief description of the problem"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT Support</SelectItem>
                    <SelectItem value="MAINTENANCE">
                      Facilities and Maintenance
                    </SelectItem>
                    <SelectItem value="HR">HR Inquiries</SelectItem>
                    <SelectItem value="GENERAL">General Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TicketPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Provide full details about the issue..."
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No tickets filed yet
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">
                    {t.ticketNumber}
                  </TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.priority === "URGENT" || t.priority === "HIGH"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "RESOLVED" || t.status === "CLOSED"
                          ? "default"
                          : "outline"
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.createdByUser?.name}</TableCell>
                  <TableCell>
                    {t.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleStatusChange(t.id, TicketStatus.IN_PROGRESS)
                        }
                      >
                        Start
                      </Button>
                    )}
                    {t.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(t.id, TicketStatus.RESOLVED)
                        }
                      >
                        Resolve
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
