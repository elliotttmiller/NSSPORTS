"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Warning, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";
import { toast } from "sonner";

/**
 * Adjust Balance Page
 * Agent can adjust player balances with reason tracking
 */

interface AgentUser {
  id: string;
  username: string;
  name: string | null;
  balance: number;
}

interface AgentUsersResponse {
  users: AgentUser[];
  summary: {
    totalUsers: number;
    totalBalance: number;
    activeUsers: number;
  };
}

export default function AdjustBalancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [players, setPlayers] = useState<AgentUser[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    playerId: "",
    adjustmentType: "deposit" as "deposit" | "withdrawal" | "correction",
    amount: "",
    reason: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<AgentUser | null>(null);

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    if (!session?.user?.isAgent && !session?.user?.isAdmin) return;
    
    setLoadingPlayers(true);
    try {
      const response = await fetch('/api/agent/users');
      if (response.ok) {
        const result = await response.json();
        const data: AgentUsersResponse = result.data;
        setPlayers(data.users);
      } else {
        toast.error('Failed to load players');
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoadingPlayers(false);
    }
  }, [session?.user?.isAgent, session?.user?.isAdmin]);

  // Redirect non-agents
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/agent/adjust-balance");
      return;
    }

    if (!session.user.isAgent && !session.user.isAdmin) {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  // Fetch players when component mounts
  useEffect(() => {
    if (!isLoading && session?.user && (session.user.isAgent || session.user.isAdmin)) {
      fetchPlayers();
    }
  }, [isLoading, session, fetchPlayers]);

  // Update selected player when playerId changes
  useEffect(() => {
    if (formData.playerId) {
      const player = players.find(p => p.id === formData.playerId);
      setSelectedPlayer(player || null);
    } else {
      setSelectedPlayer(null);
    }
  }, [formData.playerId, players]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.playerId) {
      newErrors.playerId = "Please select a player";
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    // Reason is optional with no validation rules

    // Check if withdrawal exceeds balance
    if (formData.adjustmentType === "withdrawal" && selectedPlayer) {
      if (amount > selectedPlayer.balance) {
        newErrors.amount = `Amount exceeds player balance ($${selectedPlayer.balance.toFixed(2)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent/adjust-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: formData.playerId,
          adjustmentType: formData.adjustmentType,
          amount: parseFloat(formData.amount),
          reason: formData.reason.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Balance adjusted successfully!", {
          description: `${selectedPlayer?.username}: $${result.data.previousBalance.toFixed(2)} → $${result.data.newBalance.toFixed(2)}`,
        });

        // Reset form and refresh players
        setFormData({
          playerId: "",
          adjustmentType: "deposit",
          amount: "",
          reason: "",
        });
        setErrors({});
        fetchPlayers();
      } else {
        toast.error(result.error?.message || "Failed to adjust balance");
      }
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error("An error occurred while adjusting balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Adjust Balance</h1>
            <p className="text-xs text-muted-foreground">Modify player account balances</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 max-w-2xl mx-auto">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Select Player */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Player <span className="text-destructive">*</span>
            </label>
            {loadingPlayers ? (
              <div className="text-sm text-muted-foreground">Loading players...</div>
            ) : players.length === 0 ? (
              <div className="text-sm text-muted-foreground">No players found. Register a player first.</div>
            ) : (
              <select
                value={formData.playerId}
                onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
                disabled={isSubmitting}
              >
                <option value="">Choose a player...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name || player.username} (@{player.username}) - Balance: ${player.balance.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
            {errors.playerId && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.playerId}</span>
              </div>
            )}
          </div>

          {/* Selected Player Info */}
          {selectedPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-accent/10 border border-accent/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} weight="fill" className="text-accent" />
                <span className="text-sm font-medium text-foreground">Selected Player</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium text-foreground">@{selectedPlayer.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-bold text-accent">${selectedPlayer.balance.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Adjustment Type */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Adjustment Type <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, adjustmentType: "deposit" })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formData.adjustmentType === "deposit"
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-background border border-border text-muted-foreground hover:border-accent/30"
                }`}
                disabled={isSubmitting}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, adjustmentType: "withdrawal" })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formData.adjustmentType === "withdrawal"
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-background border border-border text-muted-foreground hover:border-accent/30"
                }`}
                disabled={isSubmitting}
              >
                Withdrawal
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, adjustmentType: "correction" })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formData.adjustmentType === "correction"
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-background border border-border text-muted-foreground hover:border-accent/30"
                }`}
                disabled={isSubmitting}
              >
                Correction
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="pl-8"
                disabled={isSubmitting}
              />
            </div>
            {errors.amount && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.amount}</span>
              </div>
            )}
            {selectedPlayer && formData.amount && !errors.amount && (
              <div className="mt-2 text-sm text-muted-foreground">
                New balance: ${(
                  formData.adjustmentType === "withdrawal"
                    ? selectedPlayer.balance - parseFloat(formData.amount || "0")
                    : selectedPlayer.balance + parseFloat(formData.amount || "0")
                ).toFixed(2)}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason <span className="text-muted-foreground text-xs">(Optional)</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain the reason for this balance adjustment..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 min-h-[100px] resize-y"
              disabled={isSubmitting}
            />
            <div className="flex justify-between mt-2">
              <div>
                {errors.reason && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <Warning size={14} weight="fill" />
                    <span>{errors.reason}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formData.reason.length} characters
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || loadingPlayers || players.length === 0}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSubmitting ? "Processing..." : "Adjust Balance"}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
