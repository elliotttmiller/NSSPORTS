"use client";

import { Suspense, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loginAction, type LoginState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Logging in..." : "Login"}
    </Button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [state, formAction] = useFormState<LoginState, FormData>(
    loginAction,
    { success: false }
  );

  // Show toast notifications based on action result
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      // Redirect after successful login
      window.location.href = callbackUrl;
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, callbackUrl]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-foreground mb-2">Login</h1>
        <p className="text-muted-foreground mb-6">
          Welcome back to NorthStar Sports
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="your_username"
            />
            {state.errors?.username && (
              <p className="text-sm text-red-500 mt-1">{state.errors.username[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
            {state.errors?.password && (
              <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>
            )}
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-accent hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
