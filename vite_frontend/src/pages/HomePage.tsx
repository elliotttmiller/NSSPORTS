import { GameCard } from "@/components/GameCard";
import { ProfessionalGameRow } from "@/components/ProfessionalGameRow";
import { CompactMobileGameRow } from "@/components/CompactMobileGameRow";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
import { TrendUp, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useBetSlip } from "@/context/BetSlipContext";
import type { Game } from "@/types";

import { useEffect, useState } from "react";
import { getTrendingGames } from "@/services/mockApi";
import { getLiveGames } from "@/services/mockApi";

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.1,
      duration: 0.4,
    },
  },
  exit: { opacity: 0, y: -30, transition: { duration: 0.3 } },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HomePage() {
  const { betSlip } = useBetSlip();
  const activeBetsCount = betSlip.bets.length; 
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);

  useEffect(() => {
    getLiveGames().then((games) => setTrendingGames(games.slice(0, 5)));
  }, []);

  // Order trending games by startTime ascending
  const orderedTrendingGames = trendingGames.slice().sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return ( 
    <AnimatePresence mode="wait">
      <motion.div
        key="home-page"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="h-full w-full flex flex-col bg-muted/10"
      >
  <SmoothScrollContainer className="flex-1 min-h-0 universal-responsive-container scrollbar-hide" showScrollbar={false} maxHeight="100vh">
        <div className="pt-2 pb-24 sm:pb-4">
          <div
            className="mx-auto w-full max-w-4xl px-4 md:px-8 lg:px-12 space-y-6"
            style={{
              padding: "var(--fluid-panel-padding)",
              fontSize: "var(--fluid-base)",
            }}
          >
            <motion.div
              variants={containerVariants}
              initial={false}
              animate="visible"
            >
              {/* Welcome Section */}
              <motion.div
                variants={sectionVariants}
                className="text-center py-8 md:py-12"
              >
                <div className="max-w-4xl mx-auto px-4">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
                    Welcome, NorthStar User
                  </h1>
                  <div className="w-16 md:w-24 h-1 bg-accent mx-auto rounded-full"></div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                variants={sectionVariants}
                className="flex justify-center"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
                  {[{ label: "Balance", value: "$1,250.00" }, { label: "Win Rate", value: "68%" }, { label: "Active Bets", value: activeBetsCount }, { label: "This Week", value: "+$340" }].map((stat) => (
                    <div key={stat.label} className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm min-h-[70px] md:min-h-[80px] p-4 h-full flex flex-col items-center justify-center gap-1" style={{ fontSize: "var(--fluid-base)", borderRadius: "var(--fluid-radius)" }}>
                      <p className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</p>
                      <p className="font-bold text-sm md:text-base text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Trending Games */}
              <motion.div variants={sectionVariants} className="mt-12">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendUp size={20} className="text-accent" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Trending Live Games
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {/* Desktop: ProfessionalGameRow, Mobile: CompactMobileGameRow */}
                    {orderedTrendingGames.map((game, idx) => (
                      <div key={game.id}>
                        <div className="hidden md:block">
                          <ProfessionalGameRow game={game} />
                        </div>
                        <div className="md:hidden">
                          <CompactMobileGameRow game={game} index={idx} />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-center mt-2">
                      <a href="/live" className="text-xs px-3 py-1 rounded bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all duration-150 shadow-sm border border-border">
                        View All
                      </a>
                    </div>
                  </div>
                </motion.div>

              {/* View All Games Button */}
              <motion.div variants={sectionVariants} className="text-center py-6">
                <Button asChild size="lg" className="px-8 py-3">
                  <Link to="/games" className="flex items-center space-x-2">
                    <Trophy size={20} />
                    <span>View All Sports & Games</span>
                  </Link>
                </Button>
              </motion.div>

              {/* Bottom spacing */}
              <div className="h-8" />
            </motion.div>
          </div>
        </div>
        </SmoothScrollContainer>
      </motion.div>
    </AnimatePresence>
  );
}
