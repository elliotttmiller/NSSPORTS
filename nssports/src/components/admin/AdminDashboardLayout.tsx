"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Shield,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/agents", icon: UserCog, label: "Agent Management" },
  { href: "/admin/players", icon: Users, label: "Player Management" },
  { href: "/admin/balances", icon: DollarSign, label: "Balance Oversight" },
  { href: "/admin/reports", icon: BarChart3, label: "Reports & Analytics" },
  { href: "/admin/config", icon: Settings, label: "System Configuration" },
  { href: "/admin/security", icon: Shield, label: "Security & Audit" },
];

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { admin, isLoading, isAuthenticated, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-accent" />
          <span className="font-bold text-lg text-foreground">Admin Dashboard</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r border-border transition-all duration-300 z-40",
          sidebarOpen ? "w-64" : "w-20",
          "hidden lg:block"
        )}
      >
        {/* Logo & Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-sm text-foreground">Admin Dashboard</h1>
                  <p className="text-xs text-muted-foreground">Client Portal</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 p-0 mx-auto"
            >
              <Menu size={16} />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={20} className="shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground">{admin.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{admin.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full justify-start gap-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full h-10 p-0"
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background">
          <div className="pt-20 pb-6 px-4">
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile User Info */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="px-4 py-3 bg-muted/50 rounded-lg mb-3">
                <p className="font-medium text-foreground">{admin.username}</p>
                <p className="text-sm text-muted-foreground capitalize">{admin.role}</p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="w-full justify-start gap-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          "pt-16 lg:pt-0",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
