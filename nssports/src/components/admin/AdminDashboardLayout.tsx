"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Header } from "@/components/layouts";
import { 
  LayoutDashboard, 
  UserCog, 
  DollarSign, 
  BarChart3, 
  Shield,
  Scale
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/agents", icon: UserCog, label: "Agents & Players" },
  { href: "/admin/balances", icon: DollarSign, label: "Balances" },
  { href: "/admin/reconciliation", icon: Scale, label: "Reconcile" },
  { href: "/admin/reports", icon: BarChart3, label: "Reports" },
  { href: "/admin/security", icon: Shield, label: "Security" },
];

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { admin, isLoading, isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log('[AdminDashboardLayout] Render - pathname:', pathname, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'admin:', admin);

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('[AdminDashboardLayout] useEffect - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (!isLoading && !isAuthenticated) {
      console.log('[AdminDashboardLayout] useEffect - Not authenticated, redirecting to /admin/login');
      router.push("/admin/login");
    } else if (!isLoading && isAuthenticated) {
      console.log('[AdminDashboardLayout] useEffect - Authenticated, staying on dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state
  if (isLoading) {
    console.log('[AdminDashboardLayout] Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !admin) {
    console.log('[AdminDashboardLayout] Not authenticated or no admin, returning null');
    return null;
  }

  console.log('[AdminDashboardLayout] Rendering full dashboard layout');

  return (
    <div className="min-h-screen bg-background">
      {/* Global Header */}
      <Header />

      {/* Admin Navigation Bar - Modern Sleek Design with Safe Areas */}
      <div 
        className="fixed left-0 right-0 bg-card/95 backdrop-blur-md border-b border-border/50 z-40 shadow-sm"
        style={{
          top: 'calc(4rem + env(safe-area-inset-top))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
      >
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 touch-action-pan-x max-w-7xl mx-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-all shrink-0 text-xs font-medium min-w-fit touch-action-manipulation",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-95"
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content - Modern Sleek Container */}
      <main 
        className="pb-6 mobile-safe-area"
        style={{
          paddingTop: 'calc(7.5rem + env(safe-area-inset-top))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          minHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
