"use client";

import { usePathname } from "next/navigation";
import { ThreePanelLayout } from "@/components/layouts";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  children: ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Admin routes should render without any layout wrapper (they have their own layout)
  const isAdminRoute = pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    return <>{children}</>;
  }
  
  // Use ThreePanelLayout for all pages
  return <ThreePanelLayout>{children}</ThreePanelLayout>;
}
