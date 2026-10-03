"use client";

import * as React from "react";
import {
  getVehicleReservationsAction,
  createVehicleReservationAction,
  updateVehicleReservationStatusAction,
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
import { Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { VehicleReservationStatus } from "@prisma/client";

type ReservationItem = Awaited<
  ReturnType<typeof getVehicleReservationsAction>
>[number];

export function VehiclesManager() {
  const [reservations, setReservations] = React.useState<ReservationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [vehicleModel, setVehicleModel] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [purpose, setPurpose] = React.useState("");

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const data = await getVehicleReservationsAction();
      setReservations(data);
    } catch {
      toast.error("Failed to load vehicle reservations");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReservations();
  }, []);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createVehicleReservationAction({
      vehiclePlate,
      vehicleModel,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      purpose,
    });

    if (res.success) {
      toast.success("Vehicle booked successfully");
      setIsOpen(false);
      setVehiclePlate("");
      setVehicleModel("");
      setStartTime("");
      setEndTime("");
      setPurpose("");
      fetchReservations();
    } else {
      toast.error(res.error || "Failed to reserve vehicle");
    }
  };

  const handleCancel = async (reservationId: string) => {
    const res = await updateVehicleReservationStatusAction({
      reservationId,
      status: VehicleReservationStatus.CANCELLED,
    });
    if (res.success) {
      toast.success("Reservation cancelled");
      fetchReservations();
    } else {
      toast.error(res.error || "Failed to cancel reservation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vehicle Reservations
          </h1>
          <p className="text-muted-foreground">
            Company fleet scheduling and vehicle booking manager
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Reserve Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book a Company Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReserve} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle Plate</label>
                  <Input
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    required
                    placeholder="e.g. ABC 1234"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle Model</label>
                  <Input
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                    placeholder="e.g. Toyota Hilux"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trip Purpose</label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  placeholder="Client visit, branch audit, supply delivery..."
                />
              </div>
              <Button type="submit" className="w-full">
                Confirm Reservation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Reserved By</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No active vehicle reservations
                  </TableCell>
                </TableRow>
              )}
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-semibold">{r.vehicleModel}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {r.vehiclePlate}
                    </div>
                  </TableCell>
                  <TableCell>{r.reservedByUser?.name}</TableCell>
                  <TableCell>{r.purpose}</TableCell>
                  <TableCell>
                    {new Date(r.startTime).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(r.endTime).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "CONFIRMED"
                          ? "default"
                          : r.status === "COMPLETED"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancel(r.id)}
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Cancel
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
