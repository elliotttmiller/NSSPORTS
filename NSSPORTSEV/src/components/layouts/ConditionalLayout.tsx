"use client";

import { usePathname } from "next/navigation";
import { ThreePanelLayout, AuthLayout } from "@/components/layouts";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Admin routes should render without any layout wrapper (they have their own layout)
  const isAdminRoute = pathname.startsWith('/admin');
  
  // Use AuthLayout for authentication pages
  const isAuthPage = pathname.startsWith('/auth/') || pathname === '/welcome';
  
  if (isAdminRoute) {
    return <>{children}</>;
  }
  
  if (isAuthPage) {
    return <AuthLayout>{children}</AuthLayout>;
  }
  
  // Use ThreePanelLayout for all other pages
  return <ThreePanelLayout>{children}</ThreePanelLayout>;
}
