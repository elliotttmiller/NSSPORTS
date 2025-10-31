"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { House } from "@phosphor-icons/react";
import { useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobilePanel, setMobilePanel } = useNavigation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const handleBetsClick = () => {
    setMobilePanel(null);
    router.push("/my-bets");
  };

  const handleSportsClick = () => {
    // On mobile, toggle navigation panel to select sports/leagues
    if (mobilePanel === "navigation") {
      setMobilePanel(null);
    } else {
      setMobilePanel("navigation");
    }
  };

  const handleLiveClick = () => {
    setMobilePanel(null);
    router.push("/live");
  };

  const handleOtherClick = () => {
    // On mobile, toggle other panel for additional bet types
    if (mobilePanel === "other") {
      setMobilePanel(null);
    } else {
      setMobilePanel("other");
    }
  };

  const handleHomeClick = () => {
    setMobilePanel(null);
    router.push("/");
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-center px-2 w-full z-40 pt-0.5"
      style={{
        height: 'calc(5rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Sports - Text Only */}
      <motion.button
        onClick={handleSportsClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-12 flex-1 flex items-center justify-center mx-1 ${
          mobilePanel === "navigation"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        Sports
      </motion.button>

      {/* Live - Text Only */}
      <motion.button
        onClick={handleLiveClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-12 flex-1 flex items-center justify-center mx-1 ${
          pathname === "/live"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        Live
      </motion.button>

      {/* Home - Center Icon Only */}
      <motion.button
        onClick={handleHomeClick}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 mx-2 self-center ${
          pathname === "/"
            ? "bg-accent/70 text-accent-foreground shadow-md ring-2 ring-accent/30 scale-110"
            : "bg-secondary text-accent-foreground hover:bg-accent/60 hover:text-accent-foreground shadow-sm"
        }`}
        whileHover={{ scale: pathname === "/" ? 1.15 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
      >
        <House
          size={24}
          weight={pathname === "/" ? "fill" : "regular"}
          color="currentColor"
        />
      </motion.button>

      {/* Bets - Text Only */}
      <motion.button
        onClick={handleBetsClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-12 flex-1 flex items-center justify-center mx-1 ${
          pathname === "/my-bets"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        Bets
      </motion.button>

      {/* Other - Text Only */}
      <motion.button
        onClick={handleOtherClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-12 flex-1 flex items-center justify-center mx-1 ${
          mobilePanel === "other"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        Other
      </motion.button>
    </nav>
  );
}
