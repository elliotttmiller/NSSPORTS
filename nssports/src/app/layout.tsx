import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import { BetSlipProvider, NavigationProvider, BetHistoryProvider, MobileScrollProvider, StreamingProvider } from "@/context";
import { ConditionalLayout } from "@/components/layouts";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { AuthProvider, LiveDataProvider } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AddToHomeScreenPrompt } from "@/components/AddToHomeScreenPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NSSPORTS",
  description: "Professional sports betting platform for NFL, NBA, and NHL games",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NSSPORTS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/mn-outline.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/app/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/mn-outline.svg", sizes: "180x180", type: "image/svg+xml" },
      { url: "/app/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* iOS PWA Meta Tags - Required for standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NSSPORTS" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/app/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/app/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/app/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/app/apple-touch-icon.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        
        {/* Favicon */}
        <link rel="icon" href="/mn-outline.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <ServiceWorkerRegistration />
        <AddToHomeScreenPrompt />
        {/* Global soft shadow animation for all game lists/pages */}
        <div
          id="global-scroll-shadow"
          className="pointer-events-none fixed top-0 left-0 w-full h-6 z-30 bg-gradient-to-b from-[rgba(0,0,0,0.12)] to-transparent opacity-100 transition-opacity duration-300"
        />
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <StreamingProvider>
                <LiveDataProvider>
                  <SmoothScrollProvider>
                    <NavigationProvider>
                      <MobileScrollProvider>
                        <BetSlipProvider>
                          <BetHistoryProvider>
                            <ConditionalLayout>{children}</ConditionalLayout>
                            <Toaster richColors position="top-right" />
                          </BetHistoryProvider>
                        </BetSlipProvider>
                      </MobileScrollProvider>
                    </NavigationProvider>
                  </SmoothScrollProvider>
                </LiveDataProvider>
              </StreamingProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
