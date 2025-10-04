import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { BetSlipProvider, NavigationProvider, BetHistoryProvider } from "@/context";
import { ThreePanelLayout } from "@/components/layouts";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <NavigationProvider>
          <BetSlipProvider>
            <BetHistoryProvider>
              <ThreePanelLayout>{children}</ThreePanelLayout>
              <Toaster richColors position="top-right" />
            </BetHistoryProvider>
          </BetSlipProvider>
        </NavigationProvider>
      </body>
    </html>
  );
}
