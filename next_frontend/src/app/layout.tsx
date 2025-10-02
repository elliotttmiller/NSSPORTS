import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Toaster } from "sonner";
import { BetSlipProvider } from "@/context/BetSlipContext";

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
        <BetSlipProvider>
          <div className="h-screen flex flex-col overflow-hidden bg-background">
            <Header />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
          <Toaster richColors position="top-right" />
        </BetSlipProvider>
      </body>
    </html>
  );
}
