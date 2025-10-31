"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "superadmin" | "admin";
  createdAt: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing admin session on mount
  useEffect(() => {
    console.log('[AdminAuthContext] Component mounted, checking session...');
    checkAdminSession();
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('[AdminAuthContext] State changed - isLoading:', isLoading, 'isAuthenticated:', !!admin, 'admin:', admin);
  }, [isLoading, admin]);

  const checkAdminSession = async () => {
    console.log('[AdminAuthContext] checkAdminSession - Starting session check');
    try {
      const response = await fetch("/api/admin/auth/session", {
        credentials: 'include', // Ensure cookies are sent
      });
      console.log('[AdminAuthContext] checkAdminSession - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AdminAuthContext] checkAdminSession - Session valid, admin data:', data.admin);
        setAdmin(data.admin);
      } else {
        console.log('[AdminAuthContext] checkAdminSession - Session invalid or expired');
        setAdmin(null);
      }
    } catch (error) {
      console.error("[AdminAuthContext] checkAdminSession - Error:", error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
      console.log('[AdminAuthContext] checkAdminSession - Finished, isLoading set to false');
    }
  };

  const login = async (username: string, password: string) => {
    console.log('[AdminAuthContext] login - Starting login process for username:', username);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Ensure cookies are received
      });

      console.log('[AdminAuthContext] login - Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[AdminAuthContext] login - Login failed:', error);
        throw new Error(error.error || error.message || "Login failed");
      }

      const data = await response.json();
      console.log('[AdminAuthContext] login - Login successful, admin data:', data.admin);
      
      // Set admin state immediately
      setAdmin(data.admin);
      console.log('[AdminAuthContext] login - Admin state updated, navigating to dashboard...');
      
      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to dashboard
      console.log('[AdminAuthContext] login - Calling router.push("/admin/dashboard")');
      router.push("/admin/dashboard");
      router.refresh(); // Force a refresh to pick up the new session
      console.log('[AdminAuthContext] login - Navigation initiated');
    } catch (error) {
      console.error('[AdminAuthContext] login - Exception:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[AdminAuthContext] logout - Starting logout process');
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      console.log('[AdminAuthContext] logout - Logout API called successfully');
      setAdmin(null);
      console.log('[AdminAuthContext] logout - Admin state cleared, redirecting to login');
      router.push("/admin/login");
    } catch (error) {
      console.error("[AdminAuthContext] logout - Error:", error);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isLoading,
        login,
        logout,
        isAuthenticated: !!admin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
