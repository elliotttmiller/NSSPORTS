import { useState, useEffect } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useNavigate } from "react-router-dom";
import { Sport } from "@/types";
import { getSports } from "@/services/mockApi";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonLoader } from "@/components/SkeletonLoader";
// ...existing code...
import { motion, AnimatePresence } from "framer-motion";

export const SideNavPanel = () => {
  const { navigation, selectSport, selectLeague, setMobilePanel } =
    useNavigation();
  const navigate = useNavigate();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSports = async () => {
      try {
        const sportsData = await getSports();
        setSports(sportsData);
      } catch (error) {
        console.error("Failed to load sports:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSports();
  }, []);

  // ...existing code...

  const handleLeagueClick = (leagueId: string) => {
    const sport = sports.find((s) => s.leagues.some((l) => l.id === leagueId));
    if (sport) {
      selectSport(sport.id);
    }
    selectLeague(leagueId);
    setTimeout(() => {
      navigate("/games");
    }, 150);
    if (window.innerWidth < 1024) {
      setMobilePanel(null);
    }
  };

  const renderSportItem = (sport: Sport, index: number) => {
    const isExpanded = navigation.selectedSport === sport.id;
    return (
      <AccordionItem key={sport.id} value={sport.id} className="border-border">
        <AccordionTrigger
          className={`text-left hover:no-underline px-2 py-2 transition-all duration-200 ${
            isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
          }`}
        >
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <span
              className={`font-medium text-sm transition-colors duration-200 ${
                isExpanded ? "text-card-foreground" : "text-card-foreground/80"
              }`}
            >
              {sport.name}
            </span>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {sport.leagues.length}
            </span>
          </motion.div>
        </AccordionTrigger>
        <AccordionContent className="pb-1">
          <div className="ml-6 space-y-0.5">
            {sport.leagues.map((league, leagueIndex) => (
              <motion.button
                key={league.id}
                onClick={() => handleLeagueClick(league.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-300 ${
                  navigation.selectedLeague === league.id
                    ? "bg-accent text-accent-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-card-foreground hover:bg-muted/50"
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.2,
                  delay: leagueIndex * 0.03,
                  ease: [0.4, 0.0, 0.2, 1],
                }}
              >
                <div className="flex items-center justify-between">
                  <span>{league.name}</span>
                  <span className="text-xs opacity-60">
                    {league.games.length}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  if (loading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="sidenavpanel-loading"
          className="h-full bg-card flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-3 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-card-foreground">
              Sports
            </h2>
            <p className="text-xs text-muted-foreground">Loading sports...</p>
          </div>
          <div className="flex-1">
            <SkeletonLoader type="navigation" count={3} />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="sidenavpanel-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full bg-card flex flex-col overflow-hidden shadow-lg border-r border-border"
        style={{ "--nav-panel-width": "256px" } as React.CSSProperties}
      >
        {/* Sticky header for mobile and desktop */}
        <motion.div
          className="sticky top-0 z-10 bg-card/95 border-b border-border flex-shrink-0 px-4 py-3 md:py-4"
          style={{
            fontSize: "var(--fluid-lg)",
            borderRadius: "var(--fluid-radius)",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-semibold text-card-foreground text-lg md:text-xl">
            Sports
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Select league to view games
          </p>
        </motion.div>

        {/* Scrollable sports/league list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            className="h-full seamless-scroll overflow-y-auto px-2 md:px-4 py-2 md:py-4"
            style={{ fontSize: "var(--fluid-base)" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="space-y-1">
                <Accordion
                  type="single"
                  collapsible
                  value={navigation.selectedSport || undefined}
                  onValueChange={(value) => {
                    if (value) {
                      selectSport(value);
                    }
                  }}
                >
                  {sports.map((sport, index) => (
                    <motion.div
                      key={sport.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: [0.4, 0.0, 0.2, 1],
                      }}
                    >
                      {renderSportItem(sport, index)}
                    </motion.div>
                  ))}
                </Accordion>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
