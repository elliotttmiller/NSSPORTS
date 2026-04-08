"use client";

import { ReactNode, useEffect, useState } from "react";
import { LoadingScreen } from "../LoadingScreen";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/clientAuth";

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

function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const hardTimeout = setTimeout(() => {
      if (!isReady && status === 'loading') {
        setIsReady(true);
      }
    }, 5000);
    return () => clearTimeout(hardTimeout);
  }, [isReady, status]);

  const PUBLIC_ROUTES = [
    '/auth/login',
    '/auth/register',
    '/welcome',
    '/admin',
  ];

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!isHydrated) return;
    if (status === 'loading') {
      setIsReady(false);
      return;
    }
    if (status === 'unauthenticated' && !isPublicRoute) {
      const loginUrl = pathname !== '/auth/login' && pathname !== '/auth/register'
        ? `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`
        : '/auth/login';
      router.replace(loginUrl);
      return;
    }
    if (status === 'authenticated' && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.replace('/');
      return;
    }
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [status, isHydrated, isPublicRoute, pathname, router]);

  if (!isHydrated || status === 'loading' || !isReady) {
    return (
      <LoadingScreen 
        title={status === 'loading' ? "Authenticating..." : "Loading..."}
        subtitle={status === 'loading' ? "Verifying your session" : "Preparing your experience"}
      />
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (status === 'authenticated' && session) {
    return <>{children}</>;
  }

  return (
    <LoadingScreen 
      title="Redirecting..."
      subtitle="Please wait"
    />
  );
}
