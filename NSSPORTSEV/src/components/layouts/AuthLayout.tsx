"use client";

import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Clean, minimal layout for authentication pages */}
      <div className="min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
