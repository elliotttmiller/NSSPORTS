"use client";

import { Badge, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { formatCurrencyNoCents, formatOdds } from "@/lib/formatters";

export type BetStatus = "pending" | "won" | "lost";

export type BetLeg = {
  game?: {
    homeTeam?: { shortName?: string };
    awayTeam?: { shortName?: string };
  };
  selection: string; // 'home' | 'away' | 'over' | 'under'
  odds: number;
  line?: number;
  betType?: string; // optional: 'spread' | 'moneyline' | 'total' | 'player_prop' | 'game_prop'
  playerProp?: { playerName?: string; statType?: string; category?: string };
  gameProp?: { propType?: string; description?: string; marketCategory?: string };
};

export type BetCardBaseProps = {
  id: string;
  betType: string;
  placedAt?: string | Date | null;
  status: BetStatus;
};

function BetSummary({ stake, payout, status }: { stake: number; payout: number; status: BetStatus }) {
  const profit = status === 'lost' ? -stake : (payout - stake);
  const sign = profit > 0 ? '+' : '';
  
  return (
    <div className="pt-4 border-t border-border/50">
      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        {/* Stake */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Stake
          </span>
          <span className="text-base sm:text-lg font-bold tabular-nums text-white">
            {formatCurrencyNoCents(stake)}
          </span>
        </div>
        
        {/* Profit */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Profit
          </span>
          <span className={cn(
            "text-base sm:text-lg font-bold tabular-nums",
            profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-white"
          )}>
            {sign}{formatCurrencyNoCents(profit)}
          </span>
        </div>
        
        {/* Payout */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Payout
          </span>
          <span className="text-base sm:text-lg font-bold tabular-nums text-white">
            {formatCurrencyNoCents(status !== 'lost' ? payout : 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Utility function for formatting selection label
export function formatSelectionLabel(
  betType: string | undefined,
  selection: string,
  line?: number,
  game?: { homeTeam?: { shortName?: string }; awayTeam?: { shortName?: string } },
  playerProp?: { playerName?: string; statType?: string },
  gameProp?: { propType?: string; description?: string; marketCategory?: string }
) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const isSide = selection === 'home' || selection === 'away';
  const isTotal = selection === 'over' || selection === 'under';

  // Handle player props
  if (betType === 'player_prop' && playerProp) {
    const sel = selection.toUpperCase();
    return `${playerProp.playerName} ${sel} ${typeof line === 'number' ? Math.abs(line) : ''} ${playerProp.statType}`.trim();
  }

  // Handle game props
  if (betType === 'game_prop' && gameProp) {
    const sel = selection.toUpperCase();
    const lineStr = typeof line === 'number' ? ` ${Math.abs(line)}` : '';
    return `${gameProp.description || gameProp.propType} ${sel}${lineStr}`.trim();
  }

  // Handle total/over-under bets explicitly
  if (betType === 'total' || isTotal) {
    return `${selection.toUpperCase()} ${typeof line === 'number' ? Math.abs(line) : ''}`.trim();
  }
  // Treat as moneyline if explicitly moneyline OR side pick with no line provided
  if (betType === 'moneyline' || (isSide && (line === undefined || line === null))) {
    const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
    return `${team ?? cap(selection)} WIN`;
  }
  // spread - show team abbreviation instead of home/away (only for side bets)
  if (isSide) {
    const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
    const sign = typeof line === 'number' && line > 0 ? '+' : '';
    return `${team ?? cap(selection)} ${typeof line === 'number' ? `${sign}${line}` : ''}`.trim();
  }
  
  // Fallback
  return `${cap(selection)} ${typeof line === 'number' ? line : ''}`.trim();
}

export type BetCardSingleProps = BetCardBaseProps & {
  selection: string;
  odds: number;
  line?: number;
  stake: number;
  payout: number;
  game?: { homeTeam?: { shortName?: string }; awayTeam?: { shortName?: string } };
  playerProp?: { playerName?: string; statType?: string; category?: string };
  gameProp?: { propType?: string; description?: string; marketCategory?: string };
  children?: ReactNode;
  showTotals?: boolean; // default true; set false when embedding in betslip with custom controls
  headerActions?: ReactNode;
};

export function BetCardSingle({
  betType,
  placedAt,
  status,
  selection,
  odds,
  line,
  stake,
  payout,
  game,
  playerProp,
  gameProp,
  children,
  showTotals = true,
  headerActions,
}: BetCardSingleProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  return (
    <Card className={cn(
      "w-full max-w-full mx-auto",
      isWon
        ? "border-border/30 ring-1 ring-white/10"
        : status === "lost"
        ? "border-destructive/50 ring-1 ring-white/10"
        : "border-accent/20 ring-1 ring-accent/10"
    )}>
      <CardContent className="p-4 sm:p-5">
        {/* Header: Badges and Date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={isWon ? "default" : "outline"} 
              className={cn(
                "text-[10px] sm:text-xs font-semibold px-2 py-0.5 uppercase tracking-wider",
                isWon ? "bg-accent/10 text-accent border-accent/30" : ""
              )}
            >
              {betType === 'player_prop' ? 'PLAYER PROP' : betType === 'game_prop' ? 'GAME PROP' : betType.toUpperCase()}
            </Badge>
            <Badge 
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[10px] sm:text-xs font-semibold px-2 py-0.5 uppercase tracking-wide",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}
            >
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
              {placed ? placed.toLocaleDateString() : "-"}
            </span>
          </div>
        </div>
        
        {/* Main Bet Content */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Player Prop Enhanced Display */}
              {betType === 'player_prop' && playerProp ? (
                <div className="space-y-2">
                  {/* Player Name */}
                  <div className="font-bold text-lg sm:text-xl leading-tight text-white">
                    {playerProp.playerName}
                  </div>
                  {/* Selection, Line, Stat Type */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-accent/20 text-accent border-accent/30 uppercase tracking-wide"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    <span className="text-sm sm:text-base text-muted-foreground font-medium uppercase tracking-wide">
                      {playerProp.statType}
                    </span>
                  </div>
                  {/* Game Matchup */}
                  <div className="text-xs sm:text-sm text-muted-foreground leading-tight pt-0.5">
                    {game?.awayTeam?.shortName && game?.homeTeam?.shortName
                      ? `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`
                      : "Game details unavailable"}
                  </div>
                </div>
              ) : betType === 'player_prop' && !playerProp ? (
                /* Player Prop Fallback (missing metadata) */
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl leading-tight text-white">
                    Player Prop Bet
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-accent/20 text-accent border-accent/30 uppercase tracking-wide"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground font-medium italic">
                      (Details unavailable)
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-tight pt-0.5">
                    {game?.awayTeam?.shortName && game?.homeTeam?.shortName
                      ? `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`
                      : "Game details unavailable"}
                  </div>
                </div>
              ) : betType === 'game_prop' && gameProp ? (
                /* Game Prop Enhanced Display */
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl leading-tight text-white">
                    {gameProp.description || gameProp.propType}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-accent/20 text-accent border-accent/30 uppercase tracking-wide"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    {gameProp.marketCategory && (
                      <span className="text-sm sm:text-base text-muted-foreground font-medium uppercase tracking-wide">
                        {gameProp.marketCategory}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-tight pt-0.5">
                    {game?.awayTeam?.shortName && game?.homeTeam?.shortName
                      ? `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`
                      : "Game details unavailable"}
                  </div>
                </div>
              ) : betType === 'game_prop' && !gameProp ? (
                /* Game Prop Fallback (missing metadata) */
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl leading-tight text-white">
                    Game Prop Bet
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-accent/20 text-accent border-accent/30 uppercase tracking-wide"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground font-medium italic">
                      (Details unavailable)
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-tight pt-0.5">
                    {game?.awayTeam?.shortName && game?.homeTeam?.shortName
                      ? `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`
                      : "Game details unavailable"}
                  </div>
                </div>
              ) : (
                /* Regular Bet Display */
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl leading-tight text-white">
                    {typeof selection === "object" && selection !== null && "displaySelection" in selection
                      ? (selection as unknown as { displaySelection: string }).displaySelection
                      : formatSelectionLabel(betType, selection, line, game, playerProp)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-tight pt-0.5">
                    {(() => {
                      console.log('[BetCard] Regular bet game data:', {
                        betType,
                        selection,
                        hasGame: !!game,
                        game: game ? {
                          awayTeam: game.awayTeam,
                          homeTeam: game.homeTeam,
                        } : null
                      });
                      
                      if (game?.awayTeam?.shortName && game?.homeTeam?.shortName) {
                        return `${game.awayTeam.shortName} @ ${game.homeTeam.shortName}`;
                      }
                      return "Game details unavailable";
                    })()}
                  </div>
                </div>
              )}
            </div>
            {/* Odds Badge */}
            <Badge 
              variant="outline" 
              className="text-lg sm:text-xl font-bold px-3 py-1.5 shrink-0 tabular-nums border-2"
            >
              {formatOdds(odds)}
            </Badge>
          </div>
        </div>
        {children}
        {showTotals && <BetSummary stake={stake} payout={payout} status={status} />}
      </CardContent>
    </Card>
  );
}

export type BetCardParlayProps = BetCardBaseProps & {
  stake: number;
  payout: number;
  legs: BetLeg[];
  children?: ReactNode;
  showTotals?: boolean; // default true; set false for betslip controls
  headerActions?: ReactNode;
};

export function BetCardParlay({
  placedAt,
  status,
  stake,
  payout,
  legs,
  children,
  showTotals = true,
  headerActions,
}: BetCardParlayProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  return (
    <Card className={cn(
      "w-full max-w-full mx-auto",
      isWon 
        ? "border-green-200/50 ring-2 ring-green-100" 
        : status === "lost" 
        ? "border-red-200/50 ring-2 ring-red-100" 
        : "ring-1 ring-accent/10",
    )}>
      <CardContent className="p-4 sm:p-5">
        {/* Header: Badges and Date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={isWon ? "default" : "outline"} 
              className={cn(
                "text-[10px] sm:text-xs font-semibold px-2 py-0.5 uppercase tracking-wider",
                isWon ? "bg-green-100 text-green-800 border-green-200" : ""
              )}
            >
              PARLAY
            </Badge>
            <Badge 
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[10px] sm:text-xs font-semibold px-2 py-0.5 uppercase tracking-wide",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}
            >
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
              {placed ? placed.toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        {/* Parlay Legs */}
        <div className="space-y-3 mb-4 bg-background/50 rounded-lg p-3 sm:p-4">
          {legs.map((leg, idx) => {
            console.log('[BetCard] Parlay leg data:', {
              idx,
              betType: leg.betType,
              selection: leg.selection,
              hasGame: !!leg.game,
              game: leg.game ? {
                awayTeam: leg.game.awayTeam,
                homeTeam: leg.game.homeTeam,
              } : null
            });
            
            return (
              <div key={idx} className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-base font-semibold leading-tight text-white mb-1.5">
                    {formatSelectionLabel(leg.betType, leg.selection, leg.line, leg.game, leg.playerProp, leg.gameProp)}
                  </div>
                  {(leg.game?.awayTeam?.shortName && leg.game?.homeTeam?.shortName) ? (
                    <div className="text-xs sm:text-sm text-muted-foreground leading-tight">
                      {leg.game.awayTeam.shortName} @ {leg.game.homeTeam.shortName}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-muted-foreground/50 leading-tight italic">
                      Game details unavailable
                    </div>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className="text-base sm:text-lg font-bold px-2.5 py-1 shrink-0 tabular-nums border-2"
                >
                  {formatOdds(leg.odds)}
                </Badge>
              </div>
            );
          })}
        </div>

        {children}
        {showTotals && <BetSummary stake={stake} payout={payout} status={status} />}
      </CardContent>
    </Card>
  );
}
