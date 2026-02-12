"use client";

import { ReactNode } from "react";
import { useNavigation, useMobileScroll } from "@/context";
import { useIsMobile } from "@/hooks";
import { Header } from "./Header";
import { SideNavPanel, BetSlipPanel, SidebarToggle } from "@/components/panels";
import { FloatingBetSlipButton, MobileBetSlipPanel, BottomNav, MobileSportsPanel, MobileOtherPanel } from "@/components/features/mobile";
import { GlobalPullToRefresh } from "@/components/ui";
import { motion } from "framer-motion";

interface ThreePanelLayoutProps {
  children: ReactNode;
}

export function ThreePanelLayout({ children }: ThreePanelLayoutProps) {
  const { sideNavOpen, betSlipOpen, toggleSideNav, toggleBetSlip } = useNavigation();
  const isMobile = useIsMobile();
  const { scrollContainerRef } = useMobileScroll();

  return (
  <div className="bg-background text-foreground flex flex-col min-h-screen">
      {/* Header - Always visible */}
      <Header />
      {/* Main Layout Container - Three Panel Structure */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="flex-1 relative overflow-hidden"
        style={{ height: 'calc(100vh - 4rem - env(safe-area-inset-top))' }}
      >
        <div className="flex relative h-full w-full">
          {/* Left Sidebar Toggle Button - Desktop Only - Fixed Position */}
          <div className={`hidden lg:block fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
            sideNavOpen ? "left-72" : "left-0"
          }`}
          style={{ top: 'calc(50vh + 2rem)' }}>
            <SidebarToggle
              side="left"
              isOpen={sideNavOpen}
              onToggle={toggleSideNav}
            />
          </div>

          {/* Right Sidebar Toggle Button - Desktop Only - Fixed Position */}
          <div className={`hidden lg:block fixed top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
            betSlipOpen ? "right-96" : "right-0"
          }`}
          style={{ top: 'calc(50vh + 2rem)' }}>
            <SidebarToggle
              side="right"
              isOpen={betSlipOpen}
              onToggle={toggleBetSlip}
            />
          </div>

          {/* Left Panel - Side Navigation (Collapsible) - Fixed */}
          <div
            className={`hidden lg:block border-r border-border bg-background transition-all duration-300 ease-in-out fixed left-0 z-20 ${
              sideNavOpen ? "w-72" : "w-0"
            }`}
            style={{ 
              top: 'calc(4rem + env(safe-area-inset-top))',
              height: 'calc(100vh - 4rem - env(safe-area-inset-top))',
              overflow: 'hidden'
            }}
          >
            {sideNavOpen && (
              <div className="h-full overflow-hidden">
                <SideNavPanel />
              </div>
            )}
          </div>

          {/* Center Panel - Main Content */}
          <div 
            className={`flex-1 min-w-0 relative transition-all duration-300 ease-in-out overflow-hidden ${
              !isMobile && sideNavOpen ? "lg:ml-72" : ""
            } ${
              !isMobile && betSlipOpen ? "lg:mr-96" : ""
            }`}
          >
            {isMobile ? (
              /* Mobile: Unified scroll container with global scroll management */
              <div 
                ref={scrollContainerRef}
                className="fixed inset-0 overflow-y-auto seamless-scroll bg-background"
                style={{
                  top: 'calc(4rem + env(safe-area-inset-top))',
                  bottom: 'calc(5rem + env(safe-area-inset-bottom))',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain', // Prevent native overscroll
                  touchAction: 'pan-y', // Only allow vertical scrolling, prevent other touch gestures
                }}
                data-mobile-scroll
              >
                {/* Pull-to-Refresh integrated with content */}
                <GlobalPullToRefresh>
                  {children}
                </GlobalPullToRefresh>
              </div>
            ) : (
              /* Desktop: Scrollable content with proper header spacing */
              <div className="h-full overflow-y-auto bg-background">
                <div className="min-h-full pt-8 pb-2">
                  {children}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Bet Slip (Collapsible) - Fixed */}
          <div
            className={`hidden lg:block border-l border-border bg-background transition-all duration-300 ease-in-out overflow-hidden fixed right-0 z-20 ${
              betSlipOpen ? "w-96" : "w-0"
            }`}
            style={{ 
              top: 'calc(4rem + env(safe-area-inset-top))',
              height: 'calc(100vh - 4rem - env(safe-area-inset-top))'
            }}
          >
            {betSlipOpen && (
              <div className="h-full overflow-hidden">
                <BetSlipPanel />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile Components */}
      {isMobile && (
        <>
          <FloatingBetSlipButton />
          <MobileBetSlipPanel />
          <MobileSportsPanel />
          <MobileOtherPanel />
          <BottomNav />
        </>
      )}
    </div>
  );
}
