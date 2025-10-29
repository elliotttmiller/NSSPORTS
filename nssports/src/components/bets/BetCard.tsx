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
    <div className="pt-2.5 mt-2.5 border-t border-border/30">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Stake */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.05em] font-bold">
            Stake
          </span>
          <span className="text-sm font-bold tabular-nums text-white">
            {formatCurrencyNoCents(stake)}
          </span>
        </div>
        
        {/* Profit */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.05em] font-bold">
            Profit
          </span>
          <span className={cn(
            "text-sm font-bold tabular-nums",
            profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-white"
          )}>
            {sign}{formatCurrencyNoCents(profit)}
          </span>
        </div>
        
        {/* Payout */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.05em] font-bold">
            Payout
          </span>
          <span className="text-sm font-bold tabular-nums text-white">
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
    const statType = playerProp.statType 
      ? playerProp.statType.charAt(0).toUpperCase() + playerProp.statType.slice(1).toLowerCase()
      : '';
    const lineStr = typeof line === 'number' ? ` ${Math.abs(line)}` : '';
    return `${playerProp.playerName}\n${sel}${lineStr} ${statType}`.trim();
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
    <Card 
      className={cn(
        "w-full max-w-full mx-auto",
        // Mobile: Completely non-interactive for smooth scrolling
        "touch-pan-y select-none",
        isWon
          ? "border-border/30 ring-1 ring-white/10"
          : status === "lost"
          ? "border-destructive/50 ring-1 ring-white/10"
          : "border-accent/20 ring-1 ring-accent/10"
      )}
      style={{
        touchAction: 'pan-y', // Only vertical scrolling
        WebkitTouchCallout: 'none', // Disable iOS callout
        WebkitUserSelect: 'none', // Disable text selection on touch
        userSelect: 'none',
      }}
    >
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        {/* Header: Badges and Date */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}
            >
              {status.toUpperCase()}
            </Badge>
            <Badge 
              variant={isWon ? "default" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-accent/10 text-accent border-accent/30" : ""
              )}
            >
              {betType === 'player_prop' ? 'PLAYER PROP' : betType === 'game_prop' ? 'GAME PROP' : betType.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 tabular-nums">
              {placed ? placed.toLocaleDateString() : "-"}
            </span>
          </div>
        </div>
        
        {/* Main Bet Content */}
        <div className="mb-2.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              {/* Player Prop Enhanced Display */}
              {betType === 'player_prop' && playerProp && game?.awayTeam?.shortName && game?.homeTeam?.shortName ? (
                <div>
                  {/* Game Matchup - Top */}
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-[0.06em] font-semibold leading-tight mb-2">
                    {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                  </div>
                  {/* Player Name - Middle */}
                  <div className="font-bold text-[15px] sm:text-base leading-tight text-white mb-2">
                    {playerProp.playerName}
                  </div>
                  {/* Selection, Line, Stat Type - Bottom */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 bg-accent/20 text-accent border-accent/30 uppercase tracking-[0.05em]"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-base sm:text-lg font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-semibold uppercase tracking-[0.05em]">
                      {playerProp.statType}
                    </span>
                  </div>
                </div>
              ) : betType === 'game_prop' && gameProp && game?.awayTeam?.shortName && game?.homeTeam?.shortName ? (
                /* Game Prop Enhanced Display */
                <div className="space-y-1.5">
                  {/* Game Matchup - Top */}
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-[0.06em] font-semibold leading-tight">
                    {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                  </div>
                  {/* Prop Description - Middle */}
                  <div className="font-bold text-[15px] sm:text-base leading-tight text-white">
                    {gameProp.description || gameProp.propType}
                  </div>
                  {/* Selection, Line, Category - Bottom */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 bg-accent/20 text-accent border-accent/30 uppercase tracking-[0.05em]"
                    >
                      {selection}
                    </Badge>
                    {typeof line === 'number' && (
                      <span className="text-base sm:text-lg font-extrabold text-white tabular-nums">
                        {Math.abs(line)}
                      </span>
                    )}
                    {gameProp.marketCategory && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-semibold uppercase tracking-[0.05em]">
                        {gameProp.marketCategory}
                      </span>
                    )}
                  </div>
                </div>
              ) : game?.awayTeam?.shortName && game?.homeTeam?.shortName ? (
                /* Regular Bet Display */
                <div className="space-y-1.5">
                  {/* Game Matchup - Top */}
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-[0.06em] font-semibold leading-tight">
                    {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                  </div>
                  {/* Bet Selection - Bottom */}
                  <div className="font-bold text-[15px] sm:text-base leading-tight text-white">
                    {formatSelectionLabel(betType, selection, line, game, playerProp)}
                  </div>
                </div>
              ) : null}
            </div>
            {/* Odds Badge */}
            <Badge 
              variant="outline" 
              className="text-base sm:text-lg font-bold px-2.5 py-1 shrink-0 tabular-nums border-2"
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
    <Card 
      className={cn(
        "w-full max-w-full mx-auto",
        // Mobile: Completely non-interactive for smooth scrolling
        "touch-pan-y select-none",
        isWon 
          ? "border-green-200/50 ring-2 ring-green-100" 
          : status === "lost" 
          ? "border-red-200/50 ring-2 ring-red-100" 
          : "ring-1 ring-accent/10",
      )}
      style={{
        touchAction: 'pan-y', // Only vertical scrolling
        WebkitTouchCallout: 'none', // Disable iOS callout
        WebkitUserSelect: 'none', // Disable text selection on touch
        userSelect: 'none',
      }}
    >
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        {/* Header: Badges and Date */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant={isWon ? "default" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-green-100 text-green-800 border-green-200" : ""
              )}
            >
              PARLAY
            </Badge>
            <Badge 
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}
            >
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 tabular-nums">
              {placed ? placed.toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        {/* Parlay Legs */}
        <div className="space-y-2 mb-2.5 bg-background/30 rounded-md p-2.5">
          {legs.map((leg, idx) => {
            if (!leg.game?.awayTeam?.shortName || !leg.game?.homeTeam?.shortName) {
              return null;
            }
            
            return (
              <div key={idx} className="flex items-start justify-between gap-2.5 py-1.5 border-b border-border/20 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0 space-y-0.5">
                  {/* Game Matchup - Top */}
                  <div className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.06em] font-semibold leading-tight">
                    {leg.game.awayTeam.shortName} @ {leg.game.homeTeam.shortName}
                  </div>
                  {/* Bet Selection - Bottom */}
                  <div className="text-[13px] sm:text-sm font-bold leading-tight text-white">
                    {formatSelectionLabel(leg.betType, leg.selection, leg.line, leg.game, leg.playerProp, leg.gameProp)}
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-sm sm:text-base font-bold px-2 py-0.5 shrink-0 tabular-nums border-2 self-center"
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
