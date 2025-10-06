"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { registerAction, type RegisterState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Creating account..." : "Register"}
    </Button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction] = useFormState<RegisterState, FormData>(
    registerAction,
    { success: false }
  );

  // Show toast notifications based on action result
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      // Redirect after successful registration
      router.push("/");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <div className="container mx-auto px-6 py-12 max-w-md">
      <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-foreground mb-2">Register</h1>
        <p className="text-muted-foreground mb-6">
          Create your NorthStar Sports account
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Name (optional)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Your name"
            />
          </div>

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
              placeholder="At least 6 characters"
            />
            {state.errors?.password && (
              <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>
            )}
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-accent hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
