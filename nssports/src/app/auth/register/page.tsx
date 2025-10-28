"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { registerAction, type RegisterState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account..." : "Register"}
    </Button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction] = useActionState<RegisterState, FormData>(registerAction, { success: false });

  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      router.push("/");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

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
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Create Account</h2>
          <p className="text-muted-foreground text-sm md:text-base">Join NSSPORTSCLUB today</p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Name (optional)</label>
            <input id="name" name="name" type="text" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:border-accent/50" placeholder="Your name" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">Username</label>
            <input id="username" name="username" type="text" required minLength={3} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:border-accent/50" placeholder="your_username" autoComplete="username" />
            {state.errors?.username && <p className="text-sm text-red-500 mt-1">{state.errors.username[0]}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">Password</label>
            <input id="password" name="password" type="password" required minLength={6} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 hover:border-accent/50" placeholder="At least 6 characters" autoComplete="new-password" />
            {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
          </div>
          <SubmitButton />
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Already have an account? <Link href="/auth/login" className="text-accent hover:underline">Login here</Link></p>
        </div>
      </motion.div>
    </motion.div>
  );
}
