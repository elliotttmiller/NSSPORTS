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
      <div className="space-y-4 w-full max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-foreground">Security & Audit</h1>
          <p className="text-xs text-muted-foreground">
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

        {/* Filters - Mobile Optimized */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm touch-action-manipulation"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">\n
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as typeof filterAction)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm"
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
              className="gap-2"
            >
              <Activity size={16} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Audit Logs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredLogs.length} of {auditLogs.length} logs
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Timestamp</th>
                  <th className="text-left p-4 font-semibold text-sm">User</th>
                  <th className="text-left p-4 font-semibold text-sm">Action</th>
                  <th className="text-left p-4 font-semibold text-sm">Resource</th>
                  <th className="text-left p-4 font-semibold text-sm">IP Address</th>
                  <th className="text-left p-4 font-semibold text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{log.user}</p>
                          <p className="text-xs text-muted-foreground">{log.role}</p>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{log.action}</td>
                      <td className="p-4 text-sm text-muted-foreground">{log.resource}</td>
                      <td className="p-4 text-sm font-mono">{log.ipAddress}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge variant={getStatusBadge(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{log.details}</td>
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
