"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Trophy, User } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";

export function Header() {
  const pathname = usePathname();


  // Mock values for demonstration
  const balance = 1250.0;
  const available = 1000.0;
  const risk = 250.0;

  // Portal dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const accountBtnRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0});

  useEffect(() => {
    if (showDropdown && accountBtnRef.current) {
      const rect = accountBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.right - 224 + window.scrollX, // 224px = dropdown width
        width: rect.width,
      });
    }
  }, [showDropdown]);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-4 relative">
      {/* Desktop Left Section */}
      <div className="hidden md:flex items-center space-x-3">
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Trophy size={24} weight="fill" className="text-accent" />
          <h1 className="text-xl font-bold text-foreground">NSSPORTSCLUB</h1>
        </Link>
      </div>

      {/* Mobile Centered Logo */}
      <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Trophy size={22} weight="fill" className="text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            NSSPORTSCLUB
          </h1>
        </Link>
      </div>

      {/* Desktop Navigation - Centered */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <nav className="flex items-center space-x-2">
          <Button
            variant={pathname === "/" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/">Home</Link>
          </Button>
          <Button
            variant={pathname === "/games" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/games">Games</Link>
          </Button>
          <Button
            variant={pathname === "/my-bets" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/my-bets">My Bets</Link>
          </Button>
          <div className="relative group">
            <div
              ref={accountBtnRef}
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
              className="inline-block"
            >
              <Button
                variant={pathname === "/account" ? "default" : "ghost"}
                size="sm"
                asChild
                className="flex items-center"
              >
                <Link href="/account">
                  <User size={16} className="mr-1" />
                  Account
                </Link>
              </Button>
            </div>
            {showDropdown && createPortal(
              <div
                style={{
                  position: "absolute",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: "224px",
                  zIndex: 99999,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div className="p-4 space-y-2">
                  <div className="flex flex-col space-y-2 text-foreground">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Balance:</span>
                      <span className="font-bold text-accent">${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Available:</span>
                      <span className="font-bold text-green-600">${available.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Risk:</span>
                      <span className="font-bold text-red-600">${risk.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </nav>
      </div>

      {/* Mobile Account Icon - Top Right */}
      <div className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
          <Link href="/account">
            <User
              size={18}
              className="text-muted-foreground hover:text-foreground transition-colors"
            />
          </Link>
        </Button>
      </div>
    </header>
  );
}
