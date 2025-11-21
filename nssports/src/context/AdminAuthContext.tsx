"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// Simple conditional logger for client-side code
const isDev = process.env.NODE_ENV === 'development';
const isDebugEnabled = isDev || process.env.NEXT_PUBLIC_LOG_LEVEL === 'debug';

const clientLogger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled) console.log(message, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
  }
};

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
    clientLogger.debug('[AdminAuthContext] Component mounted, checking session...');
    checkAdminSession();
  }, []);

  // Log state changes
  useEffect(() => {
    clientLogger.debug('[AdminAuthContext] State changed - isLoading:', isLoading, 'isAuthenticated:', !!admin, 'admin:', admin);
  }, [isLoading, admin]);

  const checkAdminSession = async () => {
    clientLogger.debug('[AdminAuthContext] checkAdminSession - Starting session check');
    try {
      const response = await fetch("/api/admin/auth/session", {
        credentials: 'include', // Ensure cookies are sent
      });
      clientLogger.debug('[AdminAuthContext] checkAdminSession - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        clientLogger.debug('[AdminAuthContext] checkAdminSession - Session valid, admin data:', data.admin);
        setAdmin(data.admin);
      } else {
        clientLogger.debug('[AdminAuthContext] checkAdminSession - Session invalid or expired');
        setAdmin(null);
      }
    } catch (error) {
      clientLogger.error("[AdminAuthContext] checkAdminSession - Error:", error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
      clientLogger.debug('[AdminAuthContext] checkAdminSession - Finished, isLoading set to false');
    }
  };

  const login = async (username: string, password: string) => {
    clientLogger.debug('[AdminAuthContext] login - Starting login process for username:', username);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Ensure cookies are received
      });

      clientLogger.debug('[AdminAuthContext] login - Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        clientLogger.error('[AdminAuthContext] login - Login failed:', error);
        throw new Error(error.error || error.message || "Login failed");
      }

      const data = await response.json();
      clientLogger.debug('[AdminAuthContext] login - Login successful, admin data:', data.admin);
      
      // Set admin state immediately
      setAdmin(data.admin);
      clientLogger.debug('[AdminAuthContext] login - Admin state updated, navigating to dashboard...');
      
      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to dashboard
      clientLogger.debug('[AdminAuthContext] login - Calling router.push("/admin/dashboard")');
      router.push("/admin/dashboard");
      router.refresh(); // Force a refresh to pick up the new session
      clientLogger.debug('[AdminAuthContext] login - Navigation initiated');
    } catch (error) {
      clientLogger.error('[AdminAuthContext] login - Exception:', error);
      throw error;
    }
  };

  const logout = async () => {
    clientLogger.debug('[AdminAuthContext] logout - Starting logout process');
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      clientLogger.debug('[AdminAuthContext] logout - Logout API called successfully');
      setAdmin(null);
      clientLogger.debug('[AdminAuthContext] logout - Admin state cleared, redirecting to login');
      router.push("/admin/login");
    } catch (error) {
      clientLogger.error("[AdminAuthContext] logout - Error:", error);
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
