"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function CreatePlayerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
    agentId: "",
    balance: 0,
    maxBetAmount: 10000,
    maxDailyBets: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.username || !formData.password || !formData.agentId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName,
          password: formData.password,
          agentId: formData.agentId,
          balance: formData.balance,
          bettingLimits: {
            maxBetAmount: formData.maxBetAmount,
            maxDailyBets: formData.maxDailyBets,
            minBetAmount: 5,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create player");
      }

      toast.success("Player created successfully");
      router.push("/admin/players");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create player");
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </Button>

        <Card className="p-6 max-w-3xl">
          <h1 className="text-2xl font-bold mb-6">Create New Player</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username *</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="player_username"
                      required
                    />
                  </div>

                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      placeholder="Player Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div>
                    <Label>Confirm Password *</Label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Assign to Agent *</Label>
                  <select
                    value={formData.agentId}
                    onChange={(e) =>
                      setFormData({ ...formData, agentId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    required
                  >
                    <option value="">Select an agent...</option>
                    <option value="agent_1">john_smith</option>
                    <option value="agent_2">lisa_ops</option>
                    <option value="agent_3">mark_t</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Balance & Limits */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Balance & Limits</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Starting Balance ($)</Label>
                    <Input
                      type="number"
                      value={formData.balance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balance: parseFloat(e.target.value),
                        })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>Max Bet Amount ($)</Label>
                    <Input
                      type="number"
                      value={formData.maxBetAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxBetAmount: parseInt(e.target.value),
                        })
                      }
                      min="0"
                    />
                  </div>

                  <div>
                    <Label>Max Daily Bets</Label>
                    <Input
                      type="number"
                      value={formData.maxDailyBets}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDailyBets: parseInt(e.target.value),
                        })
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Save size={18} />
                Create Player
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
