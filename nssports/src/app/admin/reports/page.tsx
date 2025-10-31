"use client";

import { useState } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportType, setReportType] = useState<"financial" | "agents" | "players" | "system">("financial");
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    { id: "financial" as const, label: "Financial", icon: DollarSign, color: "text-blue-500" },
    { id: "agents" as const, label: "Agents", icon: Users, color: "text-emerald-500" },
    { id: "players" as const, label: "Players", icon: Activity, color: "text-purple-500" },
    { id: "system" as const, label: "System", icon: TrendingUp, color: "text-orange-500" },
  ];

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

  const handleGenerateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range");
      return;
    }
    setIsGenerating(true);
    toast.success("Generating report...");
    
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Report generated successfully!");
    }, 1500);
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-4 w-full max-w-7xl mx-auto">
        {/* Header with Compact Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Generate and export comprehensive platform reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport("csv")}
              className="gap-1.5 touch-action-manipulation active:scale-95"
            >
              <Download size={14} />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport("pdf")}
              className="gap-1.5 touch-action-manipulation active:scale-95"
            >
              <Download size={14} />
              PDF
            </Button>
          </div>
        </div>

        {/* Compact Filter Bar */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Report Type Tabs - Sleek Design */}
            <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap">
              <Filter size={16} className="text-muted-foreground mr-1 shrink-0" />
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-action-manipulation active:scale-95 shrink-0",
                      reportType === type.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon size={14} className={reportType === type.id ? type.color : ""} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Date Range - Compact */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs h-9"
                  placeholder="From"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">to</span>
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs h-9"
                  placeholder="To"
                />
              </div>
              <Button
                onClick={handleGenerateReport}
                size="sm"
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5 touch-action-manipulation active:scale-95 shrink-0"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="hidden sm:inline">Generating</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span className="hidden sm:inline">Generate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>        {/* Report Preview - Sleek Horizontal Cards */}
        <Card className="p-4">
          {/* Financial Report */}
          {reportType === "financial" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={18} className="text-blue-500" />
                <h3 className="font-semibold text-foreground">Financial Overview</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">$1,287,456</p>
                  <p className="text-xs text-green-600/80 mt-1">↑ 12.5% vs last period</p>
                </Card>
                <Card className="p-3 bg-red-500/10 border-red-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Payouts</p>
                  <p className="text-2xl font-bold text-red-600">$987,234</p>
                  <p className="text-xs text-red-600/80 mt-1">↑ 8.2% vs last period</p>
                </Card>
                <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                  <p className="text-2xl font-bold text-blue-600">$300,222</p>
                  <p className="text-xs text-blue-600/80 mt-1">↑ 18.7% vs last period</p>
                </Card>
              </div>
            </div>
          )}

          {/* Agents Report */}
          {reportType === "agents" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-emerald-500" />
                <h3 className="font-semibold text-foreground">Agent Performance</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Active Agents</p>
                  <p className="text-2xl font-bold text-foreground">37</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Currently managing players</p>
                </Card>
                <Card className="p-3 bg-emerald-500/10 border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Adjustments</p>
                  <p className="text-2xl font-bold text-emerald-600">$1,245,890</p>
                  <p className="text-xs text-emerald-600/80 mt-1">Across all agents</p>
                </Card>
                <Card className="p-3 bg-purple-500/10 border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Avg Adjustment</p>
                  <p className="text-2xl font-bold text-purple-600">$3,367</p>
                  <p className="text-xs text-purple-600/80 mt-1">Per agent activity</p>
                </Card>
              </div>
            </div>
          )}

          {/* Players Report */}
          {reportType === "players" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={18} className="text-purple-500" />
                <h3 className="font-semibold text-foreground">Player Activity</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Players</p>
                  <p className="text-2xl font-bold text-foreground">2,847</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Registered accounts</p>
                </Card>
                <Card className="p-3 bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Active Players</p>
                  <p className="text-2xl font-bold text-green-600">1,234</p>
                  <p className="text-xs text-green-600/80 mt-1">43% engagement rate</p>
                </Card>
                <Card className="p-3 bg-purple-500/10 border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Total Bets Placed</p>
                  <p className="text-2xl font-bold text-purple-600">45,678</p>
                  <p className="text-xs text-purple-600/80 mt-1">Avg 37 bets/player</p>
                </Card>
              </div>
            </div>
          )}

          {/* System Report */}
          {reportType === "system" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-orange-500" />
                <h3 className="font-semibold text-foreground">System Health</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">System Uptime</p>
                  <p className="text-2xl font-bold text-green-600">99.98%</p>
                  <p className="text-xs text-green-600/80 mt-1">Excellent reliability</p>
                </Card>
                <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold text-blue-600">124ms</p>
                  <p className="text-xs text-blue-600/80 mt-1">Fast performance</p>
                </Card>
                <Card className="p-3 bg-purple-500/10 border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">API Calls</p>
                  <p className="text-2xl font-bold text-purple-600">1.2M</p>
                  <p className="text-xs text-purple-600/80 mt-1">Total requests handled</p>
                </Card>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Actions & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Report History</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  <div>
                    <p className="text-xs font-medium">Financial Report</p>
                    <p className="text-xs text-muted-foreground">Jan 1 - Jan 31, 2025</p>
                  </div>
                </div>
                <Download size={14} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-medium">Agents Report</p>
                    <p className="text-xs text-muted-foreground">Dec 1 - Dec 31, 2024</p>
                  </div>
                </div>
                <Download size={14} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-purple-500" />
                  <div>
                    <p className="text-xs font-medium">Players Report</p>
                    <p className="text-xs text-muted-foreground">Nov 1 - Nov 30, 2024</p>
                  </div>
                </div>
                <Download size={14} className="text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Export Options</h3>
            <div className="space-y-3">
              <div className="p-3 rounded bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Download size={14} className="text-green-600" />
                  <p className="text-xs font-medium">CSV Export</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Download report data in comma-separated format for spreadsheet analysis
                </p>
              </div>
              <div className="p-3 rounded bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Download size={14} className="text-red-600" />
                  <p className="text-xs font-medium">PDF Export</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate professionally formatted PDF report for presentations and records
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
