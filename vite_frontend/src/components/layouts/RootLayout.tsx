import { Outlet } from "react-router-dom";
import { Header } from "../Header";
import { BottomNav } from "../BottomNav";
import { SideNavPanel } from "../panels/SideNavPanel";
import { ActionHubPanel } from "../panels/ActionHubPanel";
import { FloatingBetSlipButton } from "../FloatingBetSlipButton";
import { BetSlipModal } from "../BetSlipModal";
import { MobileBetSlipPanel } from "../MobileBetSlipPanel";
import {
  NavigationProvider,
  useNavigation,
} from "../../context/NavigationContext";
import { BetSlipProvider } from "../../context/BetSlipContext";
import { UserProvider } from "@/context/UserContext";
import { BetHistoryProvider } from "@/context/BetHistoryContext";
import { BetsProvider } from "@/context/BetsContext";
import { Toaster } from "@/components/ui/sonner";
import { SidebarToggle } from "../SidebarToggle";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/useIsMobile";
import React from "react";

// ...existing code...

// Removed duplicate RootLayout implementation. Use the named export below.
function LayoutContent() {
  const { navigation, setMobilePanel, toggleSideNav, toggleActionHub } =
    useNavigation();
  const isMobile = useIsMobile();

  // ...existing code...

  return (
    <div className="universal-responsive-container h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header - Always visible */}
      <Header />
      {/* Main Layout Container */}
      <div className="flex-1 min-h-0 overflow-hidden relative container mx-auto px-4 max-w-screen-2xl">
        {isMobile ? (
          // MOBILE UI
          <>
            <div className="h-full min-h-0 flex flex-col pb-16">
              <div className="flex-1 min-h-0 overflow-hidden">
                <Outlet />
              </div>
              <AnimatePresence mode="wait">
                {navigation.mobilePanel === "navigation" && (
                  <motion.div
                    key="mobile-sidenav"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="fixed inset-0 top-16 z-40 bg-card"
                  >
                    <SideNavPanel />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-40">
              <BottomNav />
            </div>
            <div className="fixed inset-0 pointer-events-none z-50">
              <FloatingBetSlipButton />
            </div>
            <MobileBetSlipPanel />
            <AnimatePresence>
              {navigation.mobilePanel &&
                navigation.mobilePanel !== "workspace" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-[color:var(--color-bg-overlay)]/80 backdrop-blur-md z-30"
                    onClick={() => setMobilePanel(null)}
                  />
                )}
            </AnimatePresence>
          </>
        ) : (
          // DESKTOP UI
          <div className="h-full flex relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30">
              <SidebarToggle
                side="left"
                isOpen={navigation.sideNavOpen}
                onToggle={toggleSideNav}
              />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30">
              <SidebarToggle
                side="right"
                isOpen={navigation.actionHubOpen}
                onToggle={toggleActionHub}
              />
            </div>
            <AnimatePresence mode="wait">
              {navigation.sideNavOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="border-r border-border overflow-hidden bg-card/50 backdrop-blur-sm"
                >
                  <SideNavPanel />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1 min-w-0 overflow-hidden relative">
              <Outlet />
              <AnimatePresence mode="wait">
                {navigation.actionHubOpen && (
                  <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute top-0 right-0 bottom-0 w-96 bg-card/95 backdrop-blur-md border-l border-border z-40 shadow-2xl"
                  >
                    <ActionHubPanel />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Desktop only: BetSlipModal */}
              <BetSlipModal />
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}

export function RootLayout() {
  return (
    <NavigationProvider>
      <BetSlipProvider>
        <UserProvider>
          <BetHistoryProvider>
            <BetsProvider>
              <LayoutContent />
            </BetsProvider>
          </BetHistoryProvider>
        </UserProvider>
      </BetSlipProvider>
    </NavigationProvider>
  );
}
