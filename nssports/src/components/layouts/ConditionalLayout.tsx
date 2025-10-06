"use client";

import { usePathname } from "next/navigation";
import { ThreePanelLayout, AuthLayout } from "@/components/layouts";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Use AuthLayout for authentication pages
  const isAuthPage = pathname.startsWith('/auth/') || pathname === '/welcome';
  
  if (isAuthPage) {
    return <AuthLayout>{children}</AuthLayout>;
  }
  
  // Use ThreePanelLayout for all other pages
  return <ThreePanelLayout>{children}</ThreePanelLayout>;
}
