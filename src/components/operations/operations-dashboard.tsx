"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, FileText, Users, Car, ArrowRight } from "lucide-react";

export function OperationsDashboard() {
  const modules = [
    {
      title: "Helpdesk Tickets",
      description:
        "Manage internal staff support requests and issue resolution",
      icon: LifeBuoy,
      href: "/operations/tickets",
      actionText: "View Tickets",
    },
    {
      title: "Visitor Reception",
      description:
        "Log branch visitors, manage check ins, badges, and host notifications",
      icon: Users,
      href: "/operations/visitors",
      actionText: "Manage Visitors",
    },
    {
      title: "Vehicle Reservations",
      description:
        "Schedule company fleet vehicles and prevent booking conflicts",
      icon: Car,
      href: "/operations/vehicles",
      actionText: "View Fleet",
    },
    {
      title: "Branch Documents",
      description:
        "Centralized repository for branch policies, legal files, and contracts",
      icon: FileText,
      href: "/operations/documents",
      actionText: "Browse Documents",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branch Operations</h1>
        <p className="text-muted-foreground">
          Internal support, visitor reception, fleet, and document services
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 text-primary rounded-md p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                </div>
                <CardDescription className="pt-2">
                  {m.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={m.href}>
                  <Button variant="outline" className="w-full justify-between">
                    {m.actionText}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
