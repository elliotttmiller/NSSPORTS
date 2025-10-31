"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeSlash, CheckCircle, Warning } from "@phosphor-icons/react";
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
    displayName: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
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

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Invalid phone number format";
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
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success("Player registered successfully!", {
        description: `Username: ${formData.username}`,
      });

      // Reset form
      setFormData({
        username: "",
        displayName: "",
        password: "",
        confirmPassword: "",
        phoneNumber: "",
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/agent")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Register Player</h1>
            <p className="text-xs text-muted-foreground">Add a new player to your account</p>
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
          {/* Username */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Username <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="player_username"
              className="w-full"
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

          {/* Display Name */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Display Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="John Doe"
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.displayName && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.displayName}</span>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pr-10"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
            </label>
            <Input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full"
              disabled={isSubmitting}
            />
            {errors.phoneNumber && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <Warning size={14} weight="fill" />
                <span>{errors.phoneNumber}</span>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} weight="fill" className="text-accent shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">What happens next?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Player account will be created under your agent ID</li>
                  <li>• Player receives $1,000 starting balance</li>
                  <li>• You can manage their balance and view activity</li>
                  <li>• Player can login immediately with these credentials</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSubmitting ? "Registering..." : "Register Player"}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
