"use client";

import * as React from "react";
import {
  generateDynamicReportAction,
  exportReportToCsvAction,
  ReportResult,
} from "@/actions/reporting-actions";
import { ReportType } from "@/lib/validations/reporting";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Play, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export function ReportsManager() {
  const [reportType, setReportType] =
    React.useState<ReportType>("PROFIT_AND_LOSS");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportResult, setReportResult] = React.useState<ReportResult | null>(
    null
  );

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await generateDynamicReportAction({
        reportType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      if (res.success && res.data) {
        setReportResult(res.data);
        toast.success("Report generated successfully");
      } else {
        toast.error(res.error || "Failed to generate report");
      }
    } catch {
      toast.error("An error occurred while generating the report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const res = await exportReportToCsvAction({
      reportType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (res.success && res.csv) {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportType.toLowerCase()}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file downloaded");
    } else {
      toast.error(res.error || "Failed to export CSV");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dynamic Reports</h1>
          <p className="text-muted-foreground">
            Custom enterprise analytics, financial statements, and tabular
            exports
          </p>
        </div>
        {reportResult && (
          <Button onClick={handleExportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>
            Select the report model and date filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Model</label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFIT_AND_LOSS">
                    Profit and Loss Statement
                  </SelectItem>
                  <SelectItem value="STOCK_VALUATION">
                    Inventory Stock Valuation
                  </SelectItem>
                  <SelectItem value="PAYROLL_EXPENSES">
                    Payroll Expenses Summary
                  </SelectItem>
                  <SelectItem value="ATTENDANCE_SUMMARY">
                    Attendance Summary Log
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" /> Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportResult && (
        <div className="space-y-4">
          {reportResult.summary && (
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(reportResult.summary).map(([k, v]) => (
                <Card key={k}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      {k}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{v}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="text-primary h-5 w-5" />
                <CardTitle>{reportResult.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {reportResult.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={col.align === "right" ? "text-right" : ""}
                      >
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportResult.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={reportResult.columns.length}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No records match the selected parameters
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportResult.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {reportResult.columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={
                              col.align === "right"
                                ? "text-right font-mono"
                                : ""
                            }
                          >
                            {row[col.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
