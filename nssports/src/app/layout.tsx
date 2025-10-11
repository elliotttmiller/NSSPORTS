import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import { BetSlipProvider, NavigationProvider, BetHistoryProvider } from "@/context";
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
    ],
    apple: [
      { url: "/mn-outline.svg", sizes: "any", type: "image/svg+xml" },
    ],
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
              <LiveDataProvider>
                <SmoothScrollProvider>
                  <NavigationProvider>
                    <BetSlipProvider>
                      <BetHistoryProvider>
                        <ConditionalLayout>{children}</ConditionalLayout>
                        <Toaster richColors position="top-right" />
                      </BetHistoryProvider>
                    </BetSlipProvider>
                  </NavigationProvider>
                </SmoothScrollProvider>
              </LiveDataProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
