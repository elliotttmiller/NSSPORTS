import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { getLiveGames } from "@/services/mockApi";
import { getSports } from "@/services/mockApi";
import { ProfessionalGameRow } from "@/components/ProfessionalGameRow";
import { GameCard } from "@/components/GameCard";
import { LiveGamesFilter } from "@/components/LiveGamesFilter";
import { CompactMobileGameRow } from "@/components/CompactMobileGameRow";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
import { motion } from "framer-motion";
import type { Game } from "@/types";

export function LivePage() {
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    getLiveGames().then((games) => {
      setLiveGames(games);
    });
    getSports().then(setSports);
  }, []);

  // Group and order live games by sport, league, and startTime
  let displayGames = liveGames;
  if (selectedSport) {
    const sportObj = sports.find((s: any) => s.id.toLowerCase() === selectedSport.toLowerCase());
    if (sportObj) {
      const leagueIds = sportObj.leagues.map((l: any) => l.id.toLowerCase());
      displayGames = liveGames.filter((g) => leagueIds.includes((g.leagueId || '').toLowerCase()));
    }
  }
  if (selectedLeague) {
    displayGames = displayGames.filter((g) => (g.leagueId || '').toLowerCase() === selectedLeague.toLowerCase());
  }
  // Order by startTime ascending
  const orderedGames = displayGames.slice().sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="live-page"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full w-full flex flex-col overflow-hidden bg-muted/10"
      >
        <div className="universal-responsive-container scrollbar-hide" style={{ minHeight: '100vh' }}>
          <SmoothScrollContainer className="w-full" showScrollbar={false}>
            <div className="mx-auto w-full max-w-4xl px-4 md:px-8 lg:px-12 space-y-6 pb-32">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <h1 className="text-2xl font-bold text-foreground mb-4">Live Games</h1>
                <LiveGamesFilter
                  sports={sports}
                  selectedSport={selectedSport}
                  selectedLeague={selectedLeague}
                  onSportChange={setSelectedSport}
                  onLeagueChange={setSelectedLeague}
                />
                <div className="space-y-2">
                  {displayGames.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No live games right now.</div>
                  ) : (
                    orderedGames.map((game, idx) => (
                      <div key={game.id}>
                        <div className="hidden md:block">
                          <ProfessionalGameRow game={game} />
                        </div>
                        <div className="md:hidden">
                          <CompactMobileGameRow game={game} index={idx} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </SmoothScrollContainer>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
