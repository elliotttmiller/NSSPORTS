"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function Header() {
  const pathname = usePathname();

  return (
    <header 
      className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center px-4 z-50"
      style={{ top: 'env(safe-area-inset-top, 0)' }}
    >
      <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/mn-outline.svg"
            alt="NSSPORTSEV"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="font-bold text-lg tracking-tight">NSSPORTSEV</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link 
            href="/" 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/" 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            Calculators
          </Link>
          <Link 
            href="/odds" 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/odds" 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            Live Odds
          </Link>
          <Link 
            href="/opportunities" 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/opportunities" 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            Opportunities
          </Link>
        </nav>
      </div>
    </header>
  );
}
