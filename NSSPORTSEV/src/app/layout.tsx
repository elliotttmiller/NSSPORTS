import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import { StreamingProvider } from "@/context";
import { ConditionalLayout } from "@/components/layouts";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { LiveDataProvider } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NSSPORTSEV - Sports Odds Tracking & EV Calculator",
  description: "Real-time sports odds tracking with EV+ and arbitrage calculation for NFL, NBA, and NHL games",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NSSPORTSEV",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/mn-outline.svg",
    apple: "/app/apple-touch-icon.png",
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
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ErrorBoundary>
          <SmoothScrollProvider>
            <QueryProvider>
              <LiveDataProvider>
                <StreamingProvider>
                  <ConditionalLayout>
                    {children}
                  </ConditionalLayout>
                  <Toaster
                    position="top-center"
                    expand={false}
                    richColors
                    closeButton
                    duration={3000}
                  />
                </StreamingProvider>
              </LiveDataProvider>
            </QueryProvider>
          </SmoothScrollProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children;
}
