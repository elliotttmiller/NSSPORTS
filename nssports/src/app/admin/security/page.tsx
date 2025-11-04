"use client";

import { useState, useEffect } from "react";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MetricCard, MetricCardSection } from "@/components/ui/metric-card";
import {
  Shield,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Lock,
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: "success" | "failure" | "warning";
  details: string;
}

export default function SecurityPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failure" | "warning">("all");
  const [filterAction, setFilterAction] = useState<"all" | "login" | "balance" | "config">("all");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch("/api/admin/security/audit-logs");
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch {
      setAuditLogs([]);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || log.status === filterStatus;

    let matchesAction = true;
    if (filterAction !== "all") {
      matchesAction = log.action.toLowerCase().includes(filterAction);
    }

    return matchesSearch && matchesStatus && matchesAction;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failure":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      success: "default",
      failure: "destructive",
      warning: "secondary",
    };
    return variants[status] || "default";
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-3 w-full">
        {/* Header - Sleek & Compact (matching dashboard) */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Security & Audit</h1>
          <p className="text-xs text-muted-foreground/70">
            Monitor system activity and security events
          </p>
        </div>

        {/* Security Metrics */}
        <MetricCardSection title="Security Overview">
          <MetricCard
            icon={Shield}
            label="System Status"
            value="Secure"
            iconColor="text-emerald-600"
            bgColor="bg-emerald-500/10"
            trend="live"
          />
          <MetricCard
            icon={Activity}
            label="Active Sessions"
            value="47"
            iconColor="text-accent"
            bgColor="bg-accent/10"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Failed Logins (24h)"
            value="12"
            iconColor="text-amber-600"
            bgColor="bg-amber-500/10"
          />
          <MetricCard
            icon={Lock}
            label="Locked Accounts"
            value="3"
            iconColor="text-red-600"
            bgColor="bg-red-500/10"
          />
        </MetricCardSection>

        {/* Filters - Compact */}
        <Card className="p-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm h-8 touch-action-manipulation"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <Filter className="w-4 h-4 text-muted-foreground/70" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs h-8"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as typeof filterAction)}
                className="px-2.5 py-1.5 bg-background border border-border rounded-md text-xs h-8"
              >
                <option value="all">All Actions</option>
                <option value="login">Login Events</option>
                <option value="balance">Balance Changes</option>
                <option value="config">Configuration</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={fetchAuditLogs}
              size="sm"
              className="gap-1.5 h-8"
            >
              <Activity size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </Card>

        {/* Audit Logs Table - Compact */}
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">Audit Logs</h2>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Showing {filteredLogs.length} of {auditLogs.length} logs
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">User</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Action</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Resource</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">IP Address</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Status</th>
                  <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground/70 text-xs">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-2.5 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5">
                        <div>
                          <p className="font-medium text-xs">{log.user}</p>
                          <p className="text-[10px] text-muted-foreground/70">{log.role}</p>
                        </div>
                      </td>
                      <td className="p-2.5 font-medium text-xs">{log.action}</td>
                      <td className="p-2.5 text-xs text-muted-foreground/70">{log.resource}</td>
                      <td className="p-2.5 text-xs font-mono">{log.ipAddress}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(log.status)}
                          <Badge variant={getStatusBadge(log.status)} className="text-[10px] h-4">
                            {log.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground/70">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
