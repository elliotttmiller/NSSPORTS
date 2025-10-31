"use client";

import { useState } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportType, setReportType] = useState<"financial" | "agents" | "players" | "system">("financial");

  const handleExportReport = async (format: "csv" | "pdf") => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range first");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          dateFrom,
          dateTo,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const _data = await response.json();
      toast.success(`Report generated successfully! Downloading ${format.toUpperCase()}...`);
      
      // In a real implementation, you'd download the file here
      // window.open(_data.downloadUrl, '_blank');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export report");
    }
  };

  const handleGenerateReport = () => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range");
      return;
    }
    toast.success("Generating report...");
  };

  return (
    <AdminDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Generate comprehensive platform reports
          </p>
        </div>

        {/* Report Type Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setReportType("financial")}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === "financial"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-border hover:border-blue-400"
              }`}
            >
              <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-semibold">Financial</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue, payouts, net profit
              </p>
            </button>

            <button
              onClick={() => setReportType("agents")}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === "agents"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-border hover:border-blue-400"
              }`}
            >
              <Users className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="font-semibold">Agents</p>
              <p className="text-xs text-muted-foreground mt-1">
                Performance, adjustments
              </p>
            </button>

            <button
              onClick={() => setReportType("players")}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === "players"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-border hover:border-blue-400"
              }`}
            >
              <Activity className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-semibold">Players</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity, betting patterns
              </p>
            </button>

            <button
              onClick={() => setReportType("system")}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === "system"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-border hover:border-blue-400"
              }`}
            >
              <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
              <p className="font-semibold">System</p>
              <p className="text-xs text-muted-foreground mt-1">
                Health, usage metrics
              </p>
            </button>
          </div>
        </Card>

        {/* Date Range & Export */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Report Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date From</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Date To</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleGenerateReport}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Report Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">Report Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExportReport("csv")}
                className="gap-2"
              >
                <Download size={16} />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportReport("pdf")}
                className="gap-2"
              >
                <Download size={16} />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Financial Report */}
          {reportType === "financial" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">$1,287,456</p>
                  <p className="text-xs text-green-600 mt-1">+12.5% vs last period</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Payouts</p>
                  <p className="text-2xl font-bold text-red-600">$987,234</p>
                  <p className="text-xs text-red-600 mt-1">+8.2% vs last period</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                  <p className="text-2xl font-bold text-blue-600">$300,222</p>
                  <p className="text-xs text-blue-600 mt-1">+18.7% vs last period</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Select date range to generate detailed financial report
                </p>
              </div>
            </div>
          )}

          {/* Agents Report */}
          {reportType === "agents" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Active Agents</p>
                  <p className="text-2xl font-bold">37</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Adjustments</p>
                  <p className="text-2xl font-bold">$1,245,890</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Avg Adjustment</p>
                  <p className="text-2xl font-bold">$3,367</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Select date range to generate detailed agent performance report
                </p>
              </div>
            </div>
          )}

          {/* Players Report */}
          {reportType === "players" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Players</p>
                  <p className="text-2xl font-bold">2,847</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Active Players</p>
                  <p className="text-2xl font-bold">1,234</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Bets Placed</p>
                  <p className="text-2xl font-bold">45,678</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Select date range to generate detailed player activity report
                </p>
              </div>
            </div>
          )}

          {/* System Report */}
          {reportType === "system" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">System Uptime</p>
                  <p className="text-2xl font-bold">99.98%</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold">124ms</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">API Calls</p>
                  <p className="text-2xl font-bold">1.2M</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Select date range to generate detailed system health report
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
