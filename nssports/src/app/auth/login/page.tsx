"use client";

import { Suspense, useEffect, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loginAction, type LoginState } from "../actions";
import { useSession } from "next-auth/react";

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
  const router = useRouter();
  const { update } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loginType, setLoginType] = useState<"player" | "agent">("player");
  
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    { success: false }
  );

  // Show toast notifications and handle redirect
  useEffect(() => {
    if (state.success && state.message && !isRedirecting) {
      toast.success(state.message);
      setIsRedirecting(true);
      
      console.log('[Login] Login successful, initiating redirect...');
      
      // Determine redirect URL based on login type and user role
      let redirectUrl = callbackUrl;
      
      // Update session first, then redirect
      update()
        .then(() => {
          console.log('[Login] Session updated successfully');
          
          // Small delay to ensure session is fully synced
          setTimeout(() => {
            // Get the latest session data after update
            if (loginType === "agent") {
              redirectUrl = "/agent";
              console.log('[Login] Agent login - redirecting to agent dashboard');
            } else {
              redirectUrl = callbackUrl === "/agent" ? "/" : callbackUrl;
              console.log('[Login] Player login - redirecting to:', redirectUrl);
            }
            
            console.log('[Login] Navigating to:', redirectUrl);
            router.push(redirectUrl);
            
            // Force a refresh after navigation to ensure everything loads properly
            setTimeout(() => {
              router.refresh();
            }, 100);
          }, 300);
        })
        .catch((error) => {
          console.error('[Login] Session update error:', error);
          // Redirect anyway - session should still be valid
          setTimeout(() => {
            const fallbackUrl = loginType === "agent" ? "/agent" : callbackUrl;
            console.log('[Login] Fallback navigation to:', fallbackUrl);
            router.push(fallbackUrl);
            router.refresh();
          }, 500);
        });
    } else if (state.error) {
      toast.error(state.error);
      setIsRedirecting(false);
    }
  }, [state, callbackUrl, router, update, loginType, isRedirecting]);

  // Show loading overlay during redirect
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Logging you in...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto px-4"
    >
      {/* Centered Branding */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col items-center justify-center mb-8 md:mb-10"
      >
        <Image 
          src="/mn-outline.svg" 
          alt="NSSPORTSCLUB" 
          width={80} 
          height={80}
          className="w-16 h-16 md:w-20 md:h-20 mb-4"
          priority
        />
        <h1 className="text-xl md:text-2xl font-bold text-foreground text-center">NSSPORTSCLUB</h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Sign in to your account
          </p>
        </div>

        {/* Agent/Player Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setLoginType("player")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              loginType === "player"
                ? "bg-accent text-accent-foreground shadow-md"
                : "bg-background border border-border text-muted-foreground hover:border-accent/30"
            }`}
          >
            Player Login
          </button>
          <button
            type="button"
            onClick={() => setLoginType("agent")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              loginType === "agent"
                ? "bg-accent text-accent-foreground shadow-md"
                : "bg-background border border-border text-muted-foreground hover:border-accent/30"
            }`}
          >
            Agent Login
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="loginType" value={loginType} />
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
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:border-accent/50"
              placeholder="your_username"
              autoComplete="username"
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
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:border-accent/50"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {state.errors?.password && (
              <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto">
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
