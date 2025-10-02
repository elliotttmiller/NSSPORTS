import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
import { useBetSlip } from "@/context/BetSlipContext";
import { useNavigation } from "@/context/NavigationContext";
import {
  Pulse,
  Star,
  Target,
  TrendUp,
  Trophy,
  Users,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const OtherPage = () => {
  const navigate = useNavigate();
  const { betSlip } = useBetSlip();
  const { setMobilePanel } = useNavigation();

  const betTypes = [
    {
      id: "prop-builder",
      name: "Prop Builder",
      icon: Target,
      description: "Build custom player props",
    },
    {
      id: "same-game-parlay",
      name: "Same Game Parlay",
      icon: TrendUp,
      description: "Multiple bets from one game",
    },
    {
      id: "player-props",
      name: "Player Props",
      icon: Users,
      description: "Individual player statistics",
    },
    {
      id: "futures",
      name: "Futures",
      icon: Trophy,
      description: "Season-long outcomes",
    },
    {
      id: "live-betting",
      name: "Live Betting",
      icon: Pulse,
      description: "Real-time in-game betting",
    },
    {
      id: "specials",
      name: "Specials",
      icon: Star,
      description: "Unique betting opportunities",
    },
  ];

  const handleBetTypeClick = () => {
    navigate("/games");
    if (window.innerWidth < 1024) {
      setMobilePanel(null);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="other-page"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full w-full flex flex-col overflow-hidden bg-muted/10"
      >
          <SmoothScrollContainer
            className="flex-1 min-h-0 universal-responsive-container scrollbar-hide"
            showScrollbar={false}
            maxHeight="100vh"
        >
          <div className="container mx-auto px-4 max-w-screen-lg w-full">
            {/* Header */}
            <motion.div
              className="p-4 border-b border-border flex-shrink-0"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-card-foreground">
                Other Bet Types
              </h2>
              <p className="text-sm text-muted-foreground">
                Professional betting options
              </p>
              {betSlip.bets.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {betSlip.bets.length} selections
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMobilePanel("betslip")}
                    className="h-6 text-xs"
                  >
                    View Slip
                  </Button>
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-4"
            >
              <div className="space-y-3">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-card-foreground mb-2">
                    Professional Bet Types
                  </h3>
                  <div className="space-y-2">
                    {betTypes.map((betType, index) => {
                      const IconComponent = betType.icon;
                      return (
                        <motion.div
                          key={betType.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.05,
                          }}
                        >
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-auto p-3 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                            onClick={handleBetTypeClick}
                          >
                            <div className="flex items-start space-x-3 w-full">
                              <IconComponent className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="text-left">
                                <div className="font-medium text-sm">
                                  {betType.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {betType.description}
                                </div>
                              </div>
                            </div>
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </SmoothScrollContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default OtherPage;
