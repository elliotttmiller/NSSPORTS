import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
import { useBetsContext } from "@/context/BetsContext";
import { useBetHistoryContext } from "@/context/BetHistoryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  formatBetDescription,
  formatMatchup,
  formatParlayLegs,
} from "@/lib/betFormatters";

export default function MyBetsPageOptimized() {
  const { bets } = useBetsContext();
  const { betHistory } = useBetHistoryContext();
  const isMobile = useIsMobile();
  const safeBets = Array.isArray(bets) ? bets : [];
  const safeBetHistory = Array.isArray(betHistory) ? betHistory : [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="my-bets-page"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full w-full flex flex-col overflow-hidden bg-muted/10"
      >
        <div className="flex-1 min-h-0 universal-responsive-container scrollbar-hide">
          <SmoothScrollContainer
            className="w-full h-full"
            maxHeight="100vh"
            showScrollbar={false}
          >
            <div
              className={`container mx-auto max-w-screen-lg w-full ${isMobile ? "px-3" : "px-6"}`}
              style={{
                padding: "var(--fluid-panel-padding)",
                fontSize: "var(--fluid-base)",
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Tabs defaultValue="active" className="w-full">
                  <TabsList
                    className={`grid w-full grid-cols-3 mb-4 bg-muted/60 border border-border/30 ${isMobile ? "h-10" : "h-12"}`}
                  >
                    <TabsTrigger
                      value="active"
                      className={`${isMobile ? "text-xs" : "text-sm"} font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md`}
                    >
                      {isMobile ? "Active" : "Active Bets"}
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className={`${isMobile ? "text-xs" : "text-sm"} font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md`}
                    >
                      History
                    </TabsTrigger>
                    <TabsTrigger
                      value="stats"
                      className={`${isMobile ? "text-xs" : "text-sm"} font-bold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md`}
                    >
                      {isMobile ? "Stats" : "Statistics"}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="active" className="space-y-4">
                    {safeBets.length > 0 && (
                      <Card className="mb-4 bg-gradient-to-r from-secondary/10 to-secondary/20 border-secondary/30">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">Active Bets</p>
                              <p className="text-lg font-bold text-foreground">{safeBets.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">Total Staked</p>
                              <p className="text-lg font-bold text-foreground">
                                ${safeBets.reduce((sum, bet) => sum + (bet.stake || 0), 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold">Potential Payout</p>
                              <p className="text-lg font-bold text-[color:var(--color-win)]">
                                ${safeBets.reduce((sum, bet) => sum + (bet.potentialPayout || 0), 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="bg-transparent border-border/20" style={{ fontSize: "var(--fluid-base)", borderRadius: "var(--fluid-radius)" }}>
                      <CardContent className={isMobile ? "p-3" : "p-4"}>
                        <div className={`bg-transparent ${isMobile ? "space-y-3" : "space-y-4"}`}>
                          {safeBets.length === 0 ? (
                            <motion.div className="text-muted-foreground text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium">No active bets</p>
                                <p className="text-xs">Place a bet to see it here</p>
                              </div>
                            </motion.div>
                          ) : (
                            <div className={isMobile ? "space-y-3" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
                              {safeBets.map((bet, index) => (
                                <motion.div
                                  key={bet.id}
                                  className={`group w-full ${isMobile ? "rounded-xl p-4 bg-card/50 border border-border/20 shadow-sm ring-1 ring-border/10 hover:border-border/40 hover:shadow-md" : "rounded-lg bg-card/50 border border-border/30 shadow-sm ring-1 ring-border/20 hover:border-border/50 p-4 hover:bg-card/60"} transition-all duration-200 cursor-pointer hover:-translate-y-0.5`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                  whileHover={{ y: -1, scale: 1.005 }}
                                >
                                  {isMobile ? (
                                    <>
                                      {/* Mobile Professional Layout */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-foreground mb-1 leading-tight">
                                            {formatBetDescription(bet)}
                                          </div>
                                          <div className="text-xs text-muted-foreground leading-tight">
                                            {formatMatchup(bet)}
                                          </div>
                                        </div>
                                        <div className="ml-3 flex-shrink-0">
                                          <Badge className="text-accent border-accent/30 bg-accent/10 font-mono px-4 py-1 text-xs font-bold rounded-md min-w-[80px] flex items-center justify-center">
                                            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                                          </Badge>
                                        </div>
                                      </div>
                                      {/* Parlay Legs - Mobile */}
                                      {bet.betType === "parlay" && bet.legs && (
                                        <div className="mb-3 space-y-2">
                                          {formatParlayLegs(bet)
                                            .slice(0, 3)
                                            .map((leg, legIndex) => (
                                              <div key={legIndex} className="bg-background/50 border border-border/20 rounded-lg p-2">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-4 h-4 bg-accent/20 text-accent rounded-full flex items-center justify-center flex-shrink-0">
                                                      <span className="text-xs font-bold">{legIndex + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-xs font-medium text-foreground truncate">{leg.description}</div>
                                                      <div className="text-xs text-muted-foreground truncate">{leg.matchup}</div>
                                                    </div>
                                                  </div>
                                                  <Badge className="text-muted-foreground border-border/30 bg-muted/20 font-mono px-3 py-0.5 text-xs font-bold rounded ml-2 flex-shrink-0 min-w-[65px] flex items-center justify-center">
                                                    {bet.legs && bet.legs[legIndex] ? (bet.legs[legIndex].odds > 0 ? `+${bet.legs[legIndex].odds}` : bet.legs[legIndex].odds) : "-"}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                          {formatParlayLegs(bet).length > 3 && (
                                            <div className="text-xs text-muted-foreground text-center py-1">
                                              +{formatParlayLegs(bet).length - 3} more selections
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {/* Mobile Financial Grid */}
                                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/20">
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-muted-foreground mb-1">Stake</div>
                                          <div className="text-sm font-bold text-foreground">${bet.stake.toFixed(2)}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-muted-foreground mb-1">Win</div>
                                          <div className="text-sm font-bold text-green-600">
                                            ${((bet.potentialPayout || 0) - (bet.stake || 0)).toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-muted-foreground mb-1">Payout</div>
                                          <div className="text-sm font-bold text-accent">
                                            ${(bet.potentialPayout || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {/* Desktop Layout */}
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0 pr-4">
                                          <div className="text-sm font-bold text-foreground truncate mb-1">{formatBetDescription(bet)}</div>
                                          <div className="text-xs text-muted-foreground truncate">{formatMatchup(bet)}</div>
                                        </div>
                                        <Badge className="text-accent border-accent/40 bg-accent/15 font-mono px-3 py-1 text-xs font-bold min-w-[65px] text-center flex-shrink-0">
                                          {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                                        </Badge>
                                      </div>
                                      {/* Parlay Legs - Desktop */}
                                      {bet.betType === "parlay" && bet.legs && (
                                        <div className="text-xs text-muted-foreground mb-3 space-y-1 pl-2 border-l-2 border-accent/20">
                                          {formatParlayLegs(bet).map((leg, legIndex) => (
                                            <div key={legIndex} className="flex items-center justify-between">
                                              <span className="truncate flex-1">• {leg.description}</span>
                                              <Badge className="text-muted-foreground border-border/30 bg-muted/20 font-mono px-1.5 py-0.5 text-xs ml-2 flex-shrink-0">
                                                {bet.legs && bet.legs[legIndex] ? (bet.legs[legIndex].odds > 0 ? `+${bet.legs[legIndex].odds}` : bet.legs[legIndex].odds) : "-"}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Desktop Financial Summary */}
                                      <div className="flex items-center justify-between pt-3 border-t border-border/20">
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs">
                                            <span className="text-muted-foreground font-semibold">Stake: </span>
                                            <span className="font-bold text-foreground">${bet.stake.toFixed(2)}</span>
                                          </div>
                                          <div className="text-xs">
                                            <span className="text-muted-foreground font-semibold">To Win: </span>
                                            <span className="font-bold text-green-600">
                                              ${((bet.potentialPayout || 0) - (bet.stake || 0)).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-xs font-bold text-accent">
                                          ${(bet.potentialPayout || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  {/* ...History and Stats TabsContent blocks, same wrapping and structure as above... */}
                </Tabs>
              </motion.div>
            </div>
          </SmoothScrollContainer>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
