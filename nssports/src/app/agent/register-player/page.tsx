"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeSlash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui";
import { toast } from "sonner";

/**
 * Register Player Page
 * Agent can register new players under their account
 */

export default function RegisterPlayerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    note: "", // Optional note for agent to track player
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect non-agents
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/agent/register-player");
      return;
    }

    if (!session.user.isAgent && !session.user.isAdmin) {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    // Note is optional, no validation needed

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      // Call API to register player
      const response = await fetch('/api/agent/register-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          note: formData.note,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register player');
      }

      toast.success("Player registered successfully!", {
        description: `Username: ${formData.username}`,
      });

      // Reset form
      setFormData({
        username: "",
        note: "",
        password: "",
        confirmPassword: "",
      });

      // Navigate to players list after short delay
      setTimeout(() => {
        router.push("/agent/players");
      }, 1000);

    } catch (error) {
      toast.error("Failed to register player", {
        description: error instanceof Error ? error.message : "Please try again",
      });
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
    <div className="min-h-screen bg-background pb-20" style={{ paddingTop: 'calc(4rem + 1rem)' }}>
      {/* Header - Mobile Optimized */}
      <div className="bg-card border-b border-border p-3 sm:p-4 sticky z-40 shadow-sm" style={{ top: 'calc(4rem + 0.5rem)' }}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/agent")}
            className="h-8 w-8 p-0 touch-action-manipulation active:scale-95"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Register Player</h1>
            <p className="text-xs text-muted-foreground">Add a new player to your account</p>
          </div>
        </div>
      </div>

      {/* Form - Responsive Container */}
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Username */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Username <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="player_username"
              className="w-full h-10 touch-action-manipulation"
              disabled={isSubmitting}
            />
            {errors.username && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.username}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Letters, numbers, and underscores only
            </p>
          </div>

          {/* Note/Comment (Optional) */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Note / Comment <span className="text-xs text-muted-foreground">(Optional)</span>
            </label>
            <Input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g., John from poker night, Sarah's friend"
              className="w-full h-10 touch-action-manipulation"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Add a note to help you remember who this player is. Only visible to you.
            </p>
          </div>

          {/* Password */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full h-10 pr-10 touch-action-manipulation"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-action-manipulation active:scale-95"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.password}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Minimum 6 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full h-10 touch-action-manipulation"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* Submit Button - Touch Optimized */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground touch-action-manipulation active:scale-95 transition-transform"
          >
            {isSubmitting ? "Registering..." : "Register Player"}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
