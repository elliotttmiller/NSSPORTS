"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <span className="font-bold text-base sm:text-lg tracking-tight">NSSPORTSEV</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
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
            href="/live-odds" 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/live-odds" 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            Live Odds
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent/50 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border shadow-lg"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <nav className="flex flex-col p-4 space-y-2">
            <Link 
              href="/" 
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                pathname === "/" 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Calculators
            </Link>
            <Link 
              href="/live-odds" 
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                pathname === "/live-odds" 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Live Odds
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
