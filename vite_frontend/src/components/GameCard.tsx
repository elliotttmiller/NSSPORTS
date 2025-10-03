// Helper for professional spread formatting
function formatSpreadLine(line: number): string {
  if (line === 0) return "PK";
  if (line > 0) return `+${line}`;
  if (line < 0) return `${line}`;
  return "";
}
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, memo } from "react";
import { useBetSlip } from "@/context/BetSlipContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatOdds, formatTotalLine, formatTime } from "@/lib/formatters";
import { Clock } from "@phosphor-icons/react";
import { toast } from "sonner";
import { PlayerPropsSection } from "@/components/PlayerPropsSection";
import { TeamLogo } from "@/components/TeamLogo";
import { cn } from "@/lib/utils";

import type { Game, PropCategory } from "@/types";

interface GameCardProps {
  game: Game;
  className?: string;
  compact?: boolean;
}

export const GameCard = memo(
  function GameCard({ game, className, compact = false }: GameCardProps) {
    const { addBet, removeBet, betSlip } = useBetSlip();
    // Helper to check if a bet is in the bet slip (matches addBet's betId logic)
    const getBetId = useCallback(
      (betType: string, selection: string, periodOrQuarterOrHalf?: string) => {
        if (!game || !game.id) return "";
        return periodOrQuarterOrHalf
          ? `${game.id}-${betType}-${periodOrQuarterOrHalf}-${selection}`
          : `${game.id}-${betType}-${selection}`;
      },
      [game],
    );
    const isBetInSlip = useCallback(
      (betType: string, selection: string, periodOrQuarterOrHalf?: string) => {
        const betId = getBetId(betType, selection, periodOrQuarterOrHalf);
        return (
          Array.isArray(betSlip?.bets) &&
          betSlip.bets.some((b) => b.id === betId)
        );
      },
      [betSlip, getBetId],
    );
    const [isExpanded, setIsExpanded] = useState(false);
    const [propCategories] = useState<PropCategory[]>([]);
    const [propsLoading] = useState(false);
    // LIFTED expandedCategories state
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set(["popular"]),
    );

    const handleBetClick = useCallback(
      (
        e: React.MouseEvent,
        betType:
          | "spread"
          | "moneyline"
          | "total"
          | "period_winner"
          | "quarter_winner"
          | "half_winner",
        selection: "home" | "away" | "over" | "under",
        odds: number,
        line?: number,
        periodOrQuarterOrHalf?: string,
      ) => {
        e.stopPropagation();
        addBet(
          game,
          betType,
          selection,
          odds,
          line,
          undefined,
          periodOrQuarterOrHalf,
        );
        toast.success("Bet added to slip!", {
          duration: 1200,
          position: "bottom-center",
        });
      },
      [addBet, game],
    );

    // (handleExpandToggle is defined but not used, so remove it)

    return (
      <motion.div layout className={cn("w-full", className)}>
        <Card
          className={cn(
            "w-full max-w-4xl mx-auto rounded-lg border border-border/20 bg-[color:var(--color-card)]/85 transition-all duration-200 group backdrop-blur-md min-h-[72px] md:min-h-[88px] hover:-translate-y-0.5 hover:scale-[1.01] cursor-pointer flex flex-col justify-between",
            compact ? "max-w-xl" : "",
          )}
          onClick={() => setIsExpanded((v) => !v)}
        >
          <CardContent className="p-0">
            {/* Long, skinny horizontal layout with enough height for all context */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 px-6 py-5 min-h-[72px] md:min-h-[104px] w-full">
              {/* Teams & Bets, grouped by team */}
              <div className="flex flex-col flex-1 min-w-0 w-full md:w-auto gap-6">
                {/* Home (top) team and bets, with time aligned right */}
                <div className="flex flex-col gap-2 pb-2 border-b border-border/20 last:border-b-0 last:pb-0">
                  <div className="flex flex-row items-center justify-between w-full">
                    <div className="flex flex-row items-center gap-3">
                      <TeamLogo
                        team={game.homeTeam.shortName || game.homeTeam.name}
                        league={game.leagueId}
                        size={compact ? "sm" : "md"}
                        variant="circle"
                        animate={true}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-base md:text-lg truncate text-primary group-hover:text-accent transition-colors">
                          {game.homeTeam.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">
                            {game.homeTeam.shortName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {game.homeTeam.record}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="ml-2 px-2 py-0.5 text-xs font-medium bg-muted/40"
                      >
                        {game.leagueId}
                      </Badge>
                    </div>
                    <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground min-w-[90px] justify-end">
                      <Clock size={14} className="opacity-70" />
                      {formatTime(game.startTime)}
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 mt-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("spread", "home")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("spread", "home");
                          if (!game.odds?.spread?.home) return;
                          if (isBetInSlip("spread", "home")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "spread",
                              "home",
                              game.odds.spread.home.odds ?? -110,
                              game.odds.spread.home.line ?? 0,
                            );
                          }
                        }}
                      >
                        Spread {formatSpreadLine(game.odds?.spread?.home?.line ?? 0)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("moneyline", "home")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("moneyline", "home");
                          if (!game.odds?.moneyline?.home) return;
                          if (isBetInSlip("moneyline", "home")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "moneyline",
                              "home",
                              game.odds.moneyline.home.odds ?? -110,
                            );
                          }
                        }}
                      >
                        ML {formatOdds(game.odds?.moneyline?.home?.odds ?? -110)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("total", "over")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("total", "over");
                          if (!game.odds?.total?.over) return;
                          if (isBetInSlip("total", "over")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "total",
                              "over",
                              game.odds.total.over?.odds ?? -110,
                              game.odds.total.over?.line ?? 47.5,
                            );
                          }
                        }}
                      >
                        Over {formatTotalLine(game.odds?.total?.over?.line ?? 47.5)}
                    </Button>
                  </div>
                </div>
                {/* Away (bottom) team and bets */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex flex-row items-center gap-3">
                    <TeamLogo
                      team={game.awayTeam.shortName || game.awayTeam.name}
                      league={game.leagueId}
                      size={compact ? "sm" : "md"}
                      variant="circle"
                      animate={true}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-base md:text-lg truncate text-primary group-hover:text-accent transition-colors">
                        {game.awayTeam.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {game.awayTeam.shortName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {game.awayTeam.record}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 mt-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("spread", "away")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("spread", "away");
                          if (!game.odds?.spread?.away) return;
                          if (isBetInSlip("spread", "away")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "spread",
                              "away",
                              game.odds.spread.away.odds ?? -110,
                              game.odds.spread.away.line ?? 0,
                            );
                          }
                        }}
                      >
                        Spread {formatSpreadLine(game.odds?.spread?.away?.line ?? 0)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("moneyline", "away")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("moneyline", "away");
                          if (!game.odds?.moneyline?.away) return;
                          if (isBetInSlip("moneyline", "away")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "moneyline",
                              "away",
                              game.odds.moneyline.away.odds ?? -110,
                            );
                          }
                        }}
                      >
                        ML {formatOdds(game.odds?.moneyline?.away?.odds ?? -110)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-9 rounded bg-muted/20 border-border/60 transition-colors shadow-sm font-medium relative",
                        isBetInSlip("total", "under")
                          ? "bg-accent/20 border-accent text-accent-foreground"
                          : "hover:bg-accent/20 hover:border-accent hover:text-accent-foreground",
                      )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const betId = getBetId("total", "under");
                          if (!game.odds?.total?.under) return;
                          if (isBetInSlip("total", "under")) {
                            removeBet(betId);
                          } else {
                            handleBetClick(
                              e,
                              "total",
                              "under",
                              game.odds.total.under?.odds ?? -110,
                              game.odds.total.under?.line ?? 47.5,
                            );
                          }
                        }}
                      >
                        Under{" "}
                        {formatTotalLine(game.odds?.total?.under?.line ?? 47.5)}
                    </Button>
                  </div>
                </div>
              </div>
              {/* No expand/collapse icon, expand on card click */}
            </div>
            {/* Expanded Section (no toggle button, padding matches top) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden px-6 pb-5"
                >
                  <Separator className="my-3" />
                  {/* All other bets/props go here */}
                  <div className="flex flex-wrap gap-2 mb-2 auto-formatter">
                    {/* Period/Quarter/Half Winner Bets */}
                    {game.leagueId === "NHL" &&
                      (() => {
                        const periodWinners = game.odds.periodWinners;
                        if (!periodWinners) return null;
                        return [1, 2, 3].map((num) => {
                          const p =
                            periodWinners[`${num}st`] ||
                            periodWinners[`${num}nd`] ||
                            periodWinners[`${num}rd`];
                          return p ? (
                            <Button
                              key={num}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs rounded bg-muted/10 border border-border/40 hover:bg-accent/10 transition-colors whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBetClick(
                                  e,
                                  "period_winner",
                                  "home",
                                  p.odds || -110,
                                  undefined,
                                  `${num}${num === 1 ? "st" : num === 2 ? "nd" : "rd"}`,
                                );
                              }}
                            >{`${num}st Period Winner`}</Button>
                          ) : null;
                        });
                      })()}
                    {(game.leagueId === "NFL" ||
                      game.leagueId === "NBA" ||
                      game.leagueId === "NCAAF" ||
                      game.leagueId === "NCAAB") &&
                      (() => {
                        const quarterWinners = game.odds.quarterWinners;
                        const halfWinners = game.odds.halfWinners;
                        if (!quarterWinners || !halfWinners) return null;
                        return [
                          ...[1, 2, 3, 4].map((num) => {
                            const q =
                              quarterWinners[`${num}st`] ||
                              quarterWinners[`${num}nd`] ||
                              quarterWinners[`${num}rd`] ||
                              quarterWinners[`${num}th`];
                            return q ? (
                              <Button
                                key={`q${num}`}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs rounded bg-muted/10 border border-border/40 hover:bg-accent/10 transition-colors whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBetClick(
                                    e,
                                    "quarter_winner",
                                    "home",
                                    q.odds || -110,
                                    undefined,
                                    `${num}${num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th"}`,
                                  );
                                }}
                              >{`${num}${num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th"} Qtr Winner`}</Button>
                            ) : null;
                          }),
                          ...[1, 2].map((num) => {
                            const h =
                              halfWinners[`${num}st`] ||
                              halfWinners[`${num}nd`];
                            return h ? (
                              <Button
                                key={`h${num}`}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs rounded bg-muted/10 border border-border/40 hover:bg-accent/10 transition-colors whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBetClick(
                                    e,
                                    "half_winner",
                                    "home",
                                    h.odds || -110,
                                    undefined,
                                    `${num}${num === 1 ? "st" : "nd"}`,
                                  );
                                }}
                              >{`${num}${num === 1 ? "st" : "nd"} Half Winner`}</Button>
                            ) : null;
                          }),
                        ];
                      })()}
                  </div>
                  {/* Player Props Section */}
                  <PlayerPropsSection
                    categories={propCategories}
                    game={game}
                    isLoading={propsLoading}
                    compact={compact}
                    expandedCategories={expandedCategories}
                    setExpandedCategories={setExpandedCategories}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for performance optimization
    return (
      prevProps.game.id === nextProps.game.id &&
      prevProps.game.odds === nextProps.game.odds &&
      prevProps.game.status === nextProps.game.status &&
      prevProps.compact === nextProps.compact &&
      prevProps.className === nextProps.className
    );
  },
);
