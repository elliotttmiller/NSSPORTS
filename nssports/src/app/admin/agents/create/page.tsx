"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Shuffle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CreateAgentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    maxSingleAdjustment: "1000",
    dailyAdjustmentLimit: "5000",
    canSuspendPlayers: true,
    commissionRate: "",
    ipRestriction: "",
    regionAssignment: "",
    notes: "",
  });

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password, confirmPassword: password });
    toast.success("Password generated");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password) {
      toast.error("Username and password are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName || null,
          password: formData.password,
          maxSingleAdjustment: parseFloat(formData.maxSingleAdjustment),
          dailyAdjustmentLimit: parseFloat(formData.dailyAdjustmentLimit),
          canSuspendPlayers: formData.canSuspendPlayers,
          commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : null,
          ipRestriction: formData.ipRestriction || null,
          regionAssignment: formData.regionAssignment || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        toast.success("Agent created successfully");
        router.push("/admin/agents");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create agent");
      }
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create New Agent</h1>
            <p className="text-muted-foreground mt-1">
              Set up a new agent account with operational limits
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="agent_username"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier for login
                </p>
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="John Smith"
                />
                <p className="text-xs text-muted-foreground mt-1">Optional friendly name</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Temporary Password *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generatePassword}>
                      <Shuffle size={16} />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Operational Limits */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Operational Limits</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxSingleAdjustment">Max Single Adjustment ($)</Label>
                  <Input
                    id="maxSingleAdjustment"
                    type="number"
                    value={formData.maxSingleAdjustment}
                    onChange={(e) =>
                      setFormData({ ...formData, maxSingleAdjustment: e.target.value })
                    }
                    min="0"
                    step="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: $1,000</p>
                </div>

                <div>
                  <Label htmlFor="dailyAdjustmentLimit">Daily Adjustment Limit ($)</Label>
                  <Input
                    id="dailyAdjustmentLimit"
                    type="number"
                    value={formData.dailyAdjustmentLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, dailyAdjustmentLimit: e.target.value })
                    }
                    min="0"
                    step="500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: $5,000</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canSuspendPlayers"
                  checked={formData.canSuspendPlayers}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, canSuspendPlayers: checked as boolean })
                  }
                />
                <Label htmlFor="canSuspendPlayers" className="cursor-pointer">
                  Can Suspend Players
                </Label>
              </div>

              <div>
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">Optional commission percentage</p>
              </div>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Advanced Settings</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ipRestriction">IP Restriction</Label>
                <Input
                  id="ipRestriction"
                  value={formData.ipRestriction}
                  onChange={(e) => setFormData({ ...formData, ipRestriction: e.target.value })}
                  placeholder="192.168.1.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional IP address restriction
                </p>
              </div>

              <div>
                <Label htmlFor="regionAssignment">Region Assignment</Label>
                <Input
                  id="regionAssignment"
                  value={formData.regionAssignment}
                  onChange={(e) => setFormData({ ...formData, regionAssignment: e.target.value })}
                  placeholder="North America"
                />
                <p className="text-xs text-muted-foreground mt-1">Optional region assignment</p>
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes about this agent..."
                  className="w-full min-h-[100px] px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Create Agent</span>
                </>
              )}
            </Button>
            <Link href="/admin/agents">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </AdminDashboardLayout>
  );
}
