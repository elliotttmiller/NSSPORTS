"use client";

import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Clean, minimal layout for authentication pages */}
      <div className="min-h-screen flex flex-col">
        {/* Simple header with just branding */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 h-16 flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">NS</span>
              </div>
              <span className="font-semibold text-foreground">NorthStar Sports</span>
            </div>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
