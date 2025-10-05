"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { User, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui";
import { useAccount } from "@/hooks/useAccount";
import Image from "next/image";
interface MobileAccountDropdownProps {
  balance: number;
  available: number;
  risk: number;
}

function MobileAccountDropdown({ balance, available, risk }: MobileAccountDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <User
          size={18}
          className="text-muted-foreground hover:text-foreground transition-colors"
        />
      </Button>

      {showDropdown && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-card/80 backdrop-blur-sm z-40"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="fixed top-20 right-4 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 max-w-[calc(100vw-32px)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Account</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowDropdown(false)}
              >
                <X size={14} />
              </Button>
            </div>

            {/* Balance Information */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Balance:</span>
                <span className="text-sm font-bold text-foreground">
                  ${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Available:</span>
                <span className="text-sm font-bold text-accent">
                  ${available.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Risk:</span>
                <span className="text-sm font-bold text-destructive">
                  ${risk.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>

            {/* View Account Link */}
            <div className="p-4 border-t border-border">
              <div className="flex justify-center">
                <Link
                  href="/account"
                  onClick={() => setShowDropdown(false)}
                  className="text-xs px-3 py-1 rounded bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all duration-150 shadow-sm border border-border"
                >
                  View Account
                </Link>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

export function Header() {
  const pathname = usePathname();


  const { data: account } = useAccount();
  const balance = account?.balance ?? 0;
  const available = account?.available ?? 0;
  const risk = account?.risk ?? 0;

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
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-card flex items-center px-4 z-50 shadow-sm">
      {/* Desktop Centered Logo */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link
          href="/"
          className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/mn-outline.svg"
            alt="NorthStar Sports"
            width={32}
            height={32}
            className="filter drop-shadow-sm hover:drop-shadow-md transition-transform hover:scale-105 duration-200"
            priority
          />
          <h1 className="text-xl font-bold text-foreground">NSSPORTSCLUB</h1>
        </Link>
      </div>

      {/* Mobile Centered Logo */}
      <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link
          href="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/mn-outline.svg"
            alt="NorthStar Sports"
            width={32}
            height={32}
            className="filter drop-shadow-sm hover:drop-shadow-md transition-transform hover:scale-105 duration-200"
            priority
          />
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            NSSPORTSCLUB
          </h1>
        </Link>
      </div>

      {/* Desktop Account Button with Dropdown - Top Right */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2">
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
                    <span className="font-bold text-foreground">${available.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">Risk:</span>
                    <span className="font-bold text-destructive">${risk.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Mobile Account Icon with Dropdown - Top Right */}
      <div className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
        <MobileAccountDropdown 
          balance={balance}
          available={available}
          risk={risk}
        />
      </div>
    </header>
  );
}
