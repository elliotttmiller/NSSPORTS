"use client";

import { ReactNode } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { Header } from "./Header";
import { SideNavPanel } from "./SideNavPanel";
import { BetSlipPanel } from "./BetSlipPanel";
import { SidebarToggle } from "./SidebarToggle";

interface ThreePanelLayoutProps {
  children: ReactNode;
}

export function ThreePanelLayout({ children }: ThreePanelLayoutProps) {
  const { sideNavOpen, betSlipOpen, toggleSideNav, toggleBetSlip } = useNavigation();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header - Always visible */}
      <Header />
      
      {/* Main Layout Container - Three Panel Structure */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className="h-full flex relative">
          {/* Left Sidebar Toggle Button - Desktop Only */}
          <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 z-30">
            <SidebarToggle
              side="left"
              isOpen={sideNavOpen}
              onToggle={toggleSideNav}
            />
          </div>

          {/* Right Sidebar Toggle Button - Desktop Only */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-30">
            <SidebarToggle
              side="right"
              isOpen={betSlipOpen}
              onToggle={toggleBetSlip}
            />
          </div>

          {/* Left Panel - Side Navigation (Collapsible) */}
          <div
            className={`hidden lg:block border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden ${
              sideNavOpen ? "w-72" : "w-0"
            }`}
          >
            {sideNavOpen && <SideNavPanel />}
          </div>

          {/* Center Panel - Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            <div className="h-full overflow-y-auto">
              {children}
            </div>
          </div>

          {/* Right Panel - Bet Slip (Collapsible) */}
          <div
            className={`hidden lg:block border-l border-border bg-card transition-all duration-300 ease-in-out overflow-hidden ${
              betSlipOpen ? "w-96" : "w-0"
            }`}
          >
            {betSlipOpen && <BetSlipPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
