import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { BetSlipProvider } from "@/context/BetSlipContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ThreePanelLayout } from "@/components/ThreePanelLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NorthStar Sports",
  description: "Professional sports betting platform",
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
            <ThreePanelLayout>{children}</ThreePanelLayout>
            <Toaster richColors position="top-right" />
          </BetSlipProvider>
        </NavigationProvider>
      </body>
    </html>
  );
}
