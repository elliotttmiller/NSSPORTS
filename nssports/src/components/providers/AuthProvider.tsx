"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { LoadingScreen } from "../LoadingScreen";
import { usePathname, useRouter } from "next/navigation";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthGuard>{children}</AuthGuard>
    </SessionProvider>
  );
}

// Internal guard component that handles auth state and loading
function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark when client-side hydration is complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Define public routes that don't require authentication
  const PUBLIC_ROUTES = [
    '/auth/login',
    '/auth/register',
    '/welcome',
  ];

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Handle authentication flow
  useEffect(() => {
    if (!isHydrated) return;

    // Still loading session
    if (status === 'loading') {
      setIsReady(false);
      return;
    }

    // Unauthenticated - redirect to login (unless already on public route)
    if (status === 'unauthenticated' && !isPublicRoute) {
      console.log('[AuthGuard] Unauthenticated access attempt, redirecting to login');
      // Always redirect to login with callback URL (except if already on auth pages)
      const loginUrl = pathname !== '/auth/login' && pathname !== '/auth/register'
        ? `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`
        : '/auth/login';
      router.replace(loginUrl);
      return;
    }

    // Authenticated - redirect away from login if needed
    if (status === 'authenticated' && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.replace('/');
      return;
    }

    // Add minimum delay for smooth transition (prevents flash)
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150); // Reduced from 200ms for faster feel

    return () => clearTimeout(timer);
  }, [status, isHydrated, isPublicRoute, pathname, router]);

  // Show loading screen during:
  // 1. Initial hydration
  // 2. Session loading
  // 3. Redirects
  if (!isHydrated || status === 'loading' || !isReady) {
    return (
      <LoadingScreen 
        title={status === 'loading' ? "Authenticating..." : "Loading..."}
        subtitle={status === 'loading' ? "Verifying your session" : "Preparing your experience"}
      />
    );
  }

  // On public routes, allow access regardless of auth status
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // On protected routes, only render if authenticated
  if (status === 'authenticated' && session) {
    return <>{children}</>;
  }

  // Fallback: show loading (shouldn't reach here due to redirect)
  return (
    <LoadingScreen 
      title="Redirecting..."
      subtitle="Please wait"
    />
  );
}
