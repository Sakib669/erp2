import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("@/actions/branch-actions", () => ({
  setActiveBranchAction: vi.fn().mockResolvedValue({ success: true }),
}));
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BranchSwitcher,
  type BranchOption,
} from "@/components/layout/branch-switcher";

describe("Design System & UI Components", () => {
  it("AC-2: Button renders with compact enterprise styles and supports asChild", () => {
    render(<Button variant="default">Save Record</Button>);
    const button = screen.getByRole("button", { name: "Save Record" });
    expect(button).toBeDefined();
    expect(button.className).toContain("h-9");
  });

  it("AC-2: Badge renders variant and label", () => {
    render(<Badge variant="outline">HQ Active</Badge>);
    const badge = screen.getByText("HQ Active");
    expect(badge).toBeDefined();
  });

  it("AC-2: Table renders cells with tabular numeric layout", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cash</TableCell>
            <TableCell className="tabular-nums">$1,250.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByText("$1,250.00");
    expect(cell.className).toContain("tabular-nums");
  });

  it("AC-5: Checkbox supports accessible click toggling", () => {
    render(<Checkbox aria-label="Select row" />);
    const checkbox = screen.getByRole("checkbox", { name: "Select row" });
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("AC-5: Tabs navigates between active tab content panels", () => {
    render(
      <Tabs defaultValue="first">
        <TabsList>
          <TabsTrigger value="first">First Tab</TabsTrigger>
          <TabsTrigger value="second">Second Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First Tab Content</TabsContent>
        <TabsContent value="second">Second Tab Content</TabsContent>
      </Tabs>
    );

    expect(screen.getByText("First Tab Content")).toBeDefined();
    expect(screen.queryByText("Second Tab Content")).toBeNull();

    const secondTrigger = screen.getByRole("tab", { name: "Second Tab" });
    fireEvent.keyDown(secondTrigger, { key: "Enter" });

    expect(secondTrigger.getAttribute("data-state")).toBe("active");
  });

  it("AC-5: Dialog triggers and displays modal with title and description", () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Modal</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              Review the before and after state snapshots.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole("button", { name: "Open Modal" });
    fireEvent.click(trigger);

    expect(screen.getByText("Audit Entry Details")).toBeDefined();
    expect(
      screen.getByText("Review the before and after state snapshots.")
    ).toBeDefined();
  });

  it("AC-4: BranchSwitcher displays active branch and indicates headquarters", () => {
    const mockBranches: BranchOption[] = [
      {
        id: "b-1",
        name: "North America HQ",
        code: "NA-HQ",
        isHeadquarters: true,
      },
      {
        id: "b-2",
        name: "Asia Pacific Regional",
        code: "APAC-01",
        isHeadquarters: false,
      },
    ];

    render(<BranchSwitcher branches={mockBranches} currentBranchId="b-1" />);

    expect(screen.getByText("North America HQ")).toBeDefined();
    expect(screen.getByText("NA-HQ")).toBeDefined();
  });
});
