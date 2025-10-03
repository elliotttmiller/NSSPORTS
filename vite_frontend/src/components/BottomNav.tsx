import { useLocation, useNavigate } from "react-router-dom";
import { useNavigation } from "@/context/NavigationContext";
import { useBetSlip } from "@/context/BetSlipContext";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { House } from "@phosphor-icons/react";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigation, setMobilePanel } = useNavigation();
  const { betSlip } = useBetSlip();
  const isMobile = useIsMobile();

  const handleBetsClick = () => {
    setMobilePanel(null);
    navigate("/my-bets");
  };

  const handleSportsClick = () => {
    if (isMobile) {
      // On mobile, show navigation panel to select sports/leagues
      if (navigation.mobilePanel === "navigation") {
        setMobilePanel(null);
      } else {
        setMobilePanel("navigation");
      }
    } else {
      // On desktop, navigate to games page
      setMobilePanel(null);
      navigate("/games");
    }
  };

  const handleLiveClick = () => {
    setMobilePanel(null);
    navigate("/live");
  };

  const handleOtherClick = () => {
    setMobilePanel(null);
    navigate("/other");
  };

  const handleHomeClick = () => {
    setMobilePanel(null);
    navigate("/");
  };

  return (
  <nav className="bg-card/95 backdrop-blur-sm border-t border-border h-20 flex items-center justify-center px-2 w-full" style={{paddingTop: '2px'}}>
      {/* Sports - Text Only */}
      <motion.button
        onClick={handleSportsClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-[48px] flex-1 flex items-center justify-center mx-1 ${
          (location.pathname === "/games" && !isMobile) ||
          navigation.mobilePanel === "navigation"
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
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-[48px] flex-1 flex items-center justify-center mx-1 ${
          location.search.includes("filter=live")
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
          location.pathname === "/"
            ? "bg-accent text-accent-foreground shadow-lg scale-110"
            : "bg-secondary text-accent-foreground hover:bg-accent hover:text-accent-foreground shadow-md"
        }`}
        whileHover={{ scale: location.pathname === "/" ? 1.15 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
      >
          <House
            size={24}
            weight={location.pathname === "/" ? "fill" : "regular"}
            color="currentColor"
          />
      </motion.button>

      {/* Bets - Text Only with Badge */}
      <motion.button
        onClick={handleBetsClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-[48px] flex-1 flex items-center justify-center relative mx-1 ${
          location.pathname === "/my-bets"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        Bets
        {betSlip.bets.length > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold">
            {betSlip.bets.length}
          </div>
        )}
      </motion.button>

      {/* Other - Text Only */}
      <motion.button
        onClick={handleOtherClick}
        className={`px-3 py-2 rounded-md transition-all duration-200 text-[15px] font-medium min-w-[48px] flex-1 flex items-center justify-center mx-1 ${
          location.pathname === "/other"
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
