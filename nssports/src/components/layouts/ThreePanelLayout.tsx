"use client";

import { ReactNode } from "react";
import { useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";
import { Header } from "./Header";
import { SideNavPanel, BetSlipPanel, SidebarToggle } from "@/components/panels";
import { FloatingBetSlipButton, MobileBetSlipPanel, BottomNav, MobileSportsPanel } from "@/components/features/mobile";
import { motion } from "framer-motion";

interface ThreePanelLayoutProps {
  children: ReactNode;
}

export function ThreePanelLayout({ children }: ThreePanelLayoutProps) {
  const { sideNavOpen, betSlipOpen, toggleSideNav, toggleBetSlip } = useNavigation();
  const isMobile = useIsMobile();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      {/* Header - Always visible */}
      <Header />
      {/* Main Layout Container - Three Panel Structure */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="flex-1 relative"
      >
        <div className="flex relative">
          {/* Left Sidebar Toggle Button - Desktop Only */}
          <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ease-in-out ${
            sideNavOpen ? "left-[288px]" : "left-0"
          }`}>
            <SidebarToggle
              side="left"
              isOpen={sideNavOpen}
              onToggle={toggleSideNav}
            />
          </div>

          {/* Right Sidebar Toggle Button - Desktop Only */}
          <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ease-in-out ${
            betSlipOpen ? "right-[384px]" : "right-0"
          }`}>
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
          <div className="flex-1 min-w-0 relative">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className={`overflow-y-auto seamless-scroll pt-16 ${isMobile ? "mobile-safe-area pb-20" : ""}`}
            >
              {children}
            </motion.div>
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
      </motion.div>

      {/* Mobile Components */}
      {isMobile && (
        <>
          <FloatingBetSlipButton />
          <MobileBetSlipPanel />
          <MobileSportsPanel />
          <BottomNav />
        </>
      )}
    </div>
  );
}
