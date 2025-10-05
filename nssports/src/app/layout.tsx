import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import { BetSlipProvider, NavigationProvider, BetHistoryProvider } from "@/context";
import { ThreePanelLayout } from "@/components/layouts";
import { GlobalMotionProvider } from "@/components/layouts/GlobalMotionProvider";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NorthStar Sports",
  description: "Professional sports betting platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NorthStar Sports",
  },
  formatDetection: {
    telephone: false,
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
        {/* Global soft shadow animation for all game lists/pages */}
        <div
          id="global-scroll-shadow"
          className="pointer-events-none fixed top-0 left-0 w-full h-6 z-30"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0))",
            opacity: 1,
            transition: "opacity 0.3s",
          }}
        />
        <AuthProvider>
          <QueryProvider>
            <SmoothScrollProvider>
              <NavigationProvider>
                <BetSlipProvider>
                  <BetHistoryProvider>
                    <GlobalMotionProvider>
                      <ThreePanelLayout>{children}</ThreePanelLayout>
                    </GlobalMotionProvider>
                    <Toaster richColors position="top-right" />
                  </BetHistoryProvider>
                </BetSlipProvider>
              </NavigationProvider>
            </SmoothScrollProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
