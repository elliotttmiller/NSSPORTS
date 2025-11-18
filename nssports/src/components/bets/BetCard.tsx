"use client";

import { Badge, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ReactNode, ReactElement } from "react";
import { formatCurrencyNoCents, formatOdds } from "@/lib/formatters";
import { formatStatType } from "@/lib/formatStatType";

export type BetStatus = "pending" | "won" | "lost" | "push";

// Helper function to render color-coded results for ALL bet types
function renderColorCodedResult(
  actualResult: string, 
  betType?: string, 
  status?: BetStatus,
  line?: number,
  selection?: string
): ReactElement | string {
  if (!actualResult) return actualResult;

  // Handle score-based results (spread, moneyline, game props with periods)
  // Formats: "AWAY 103 - HOME 120" or "1Q: AWAY 28 - HOME 32"
  const scoreMatch = actualResult.match(/^(?:([A-Z0-9]+):\s+)?([A-Z]+)\s+(\d+)\s+-\s+([A-Z]+)\s+(\d+)$/);
  if (scoreMatch) {
    const [, period, team1, score1, team2, score2] = scoreMatch;
    const score1Num = parseInt(score1, 10);
    const score2Num = parseInt(score2, 10);
    
    // Determine winning/losing colors
    const team1Color = score1Num > score2Num ? "text-green-600" : score1Num < score2Num ? "text-red-600" : "text-foreground/80";
    const team2Color = score2Num > score1Num ? "text-green-600" : score2Num < score1Num ? "text-red-600" : "text-foreground/80";
    
    return (
      <span className="font-medium tabular-nums">
        {period && <span className="text-muted-foreground/60 mr-1">{period}:</span>}
        <span className={team1Color}>
          {team1} {score1}
        </span>
        <span className="text-muted-foreground/60 mx-1">-</span>
        <span className={team2Color}>
          {team2} {score2}
        </span>
      </span>
    );
  }

  // Handle total results: "Final: 223"
  if (betType === 'total' && actualResult.startsWith('Final: ')) {
    const total = actualResult.replace('Final: ', '');
    const totalNum = parseFloat(total);
    
    // Color code based on over/under result
    let color = "text-foreground/80";
    if (typeof line === 'number' && !isNaN(totalNum)) {
      if (totalNum > line) {
        color = selection === 'over' ? "text-green-600" : "text-red-600";
      } else if (totalNum < line) {
        color = selection === 'under' ? "text-green-600" : "text-red-600";
      }
    }
    
    return (
      <span className={cn("font-semibold tabular-nums", color)}>
        Final: {total}
      </span>
    );
  }

  // Handle player prop results: "28.5 PTS | Line: 25.5"
  if (betType === 'player_prop' && actualResult.includes('|')) {
    const parts = actualResult.split('|');
    const [statPart, linePart] = parts;
    const statMatch = statPart.trim().match(/^([\d.]+)\s+(.+)$/);
    const lineMatch = linePart?.trim().match(/^Line:\s+([\d.]+)$/);
    
    if (statMatch) {
      const [, statValue, statType] = statMatch;
      const statNum = parseFloat(statValue);
      const lineNum = lineMatch ? parseFloat(lineMatch[1]) : line;
      
      // Color code based on over/under the line
      let color = "text-foreground/80";
      if (typeof lineNum === 'number' && !isNaN(statNum)) {
        if (statNum > lineNum) {
          color = selection === 'over' ? "text-green-600" : "text-red-600";
        } else if (statNum < lineNum) {
          color = selection === 'under' ? "text-green-600" : "text-red-600";
        } else {
          color = "text-blue-500"; // Push
        }
      }
      
      return (
        <span className="font-medium">
          <span className={cn("font-bold tabular-nums", color)}>{statValue}</span>
          <span className="text-muted-foreground/70 text-[9px] ml-0.5">{statType}</span>
          {lineMatch && (
            <span className="text-muted-foreground/50 text-[8px] ml-1">
              (Line: {lineMatch[1]})
            </span>
          )}
        </span>
      );
    }
  }

  // Handle simple player prop results: "28.5 PTS"
  if (betType === 'player_prop') {
    const match = actualResult.match(/^([\d.]+)\s+(.+)$/);
    if (match) {
      const [, statValue, statType] = match;
      const statNum = parseFloat(statValue);
      
      let color = "text-foreground/80";
      if (typeof line === 'number' && !isNaN(statNum)) {
        if (statNum > line) {
          color = selection === 'over' ? "text-green-600" : "text-red-600";
        } else if (statNum < line) {
          color = selection === 'under' ? "text-green-600" : "text-red-600";
        } else {
          color = "text-blue-500";
        }
      }
      
      return (
        <span className="font-medium">
          <span className={cn("font-bold tabular-nums", color)}>{statValue}</span>
          <span className="text-muted-foreground/70 text-[9px] ml-0.5">{statType}</span>
        </span>
      );
    }
  }

  // Handle game prop single team results: "TEAM: 120"
  if (betType === 'game_prop' && actualResult.includes(':')) {
    const match = actualResult.match(/^([A-Z]+):\s+(\d+)$/);
    if (match) {
      const [, team, score] = match;
      const scoreNum = parseInt(score, 10);
      
      let color = "text-foreground/80";
      if (typeof line === 'number' && !isNaN(scoreNum)) {
        if (scoreNum > line) {
          color = selection === 'over' ? "text-green-600" : "text-red-600";
        } else if (scoreNum < line) {
          color = selection === 'under' ? "text-green-600" : "text-red-600";
        } else {
          color = "text-blue-500";
        }
      }
      
      return (
        <span className="font-medium">
          <span className="text-muted-foreground/70 text-[10px]">{team}:</span>
          <span className={cn("font-bold tabular-nums ml-1", color)}>{score}</span>
        </span>
      );
    }
  }

  // Handle parlay/teaser results: "3/4 Legs"
  if ((betType === 'parlay' || betType === 'teaser') && actualResult.includes('Legs')) {
    const match = actualResult.match(/^(\d+)\/(\d+)\s+Legs$/);
    if (match) {
      const [, won, total] = match;
      const wonNum = parseInt(won, 10);
      const totalNum = parseInt(total, 10);
      
      // Color based on result
      const color = wonNum === totalNum ? "text-green-600" : wonNum === 0 ? "text-red-600" : "text-yellow-600";
      
      return (
        <span className={cn("font-semibold", color)}>
          {won}/{total} <span className="text-muted-foreground/70 text-[9px]">Legs</span>
        </span>
      );
    }
  }

  // Handle status results: "Won", "Lost", "Push"
  if (['Won', 'Lost', 'Push'].includes(actualResult)) {
    const color = actualResult === 'Won' ? "text-green-600" : actualResult === 'Lost' ? "text-red-600" : "text-blue-500";
    return (
      <span className={cn("font-semibold", color)}>
        {actualResult}
      </span>
    );
  }

  // Default: return as-is with subtle styling
  return <span className="text-foreground/80 font-medium">{actualResult}</span>;
}

export type BetLeg = {
  game?: {
    homeTeam?: { shortName?: string; name?: string; logo?: string };
    awayTeam?: { shortName?: string; name?: string; logo?: string };
  };
  selection: string; // 'home' | 'away' | 'over' | 'under'
  odds: number;
  line?: number;
  betType?: string; // optional: 'spread' | 'moneyline' | 'total' | 'player_prop' | 'game_prop'
  playerProp?: { playerName?: string; statType?: string; category?: string };
  gameProp?: { propType?: string; description?: string; marketCategory?: string };
  actualResult?: string; // Display the actual outcome for this leg
};

export type BetCardBaseProps = {
  id: string;
  betType: string;
  placedAt?: string | Date | null;
  status: BetStatus;
  actualResult?: string; // Display the actual outcome
};

function BetSummary({ stake, payout, status }: { stake: number; payout: number; status: BetStatus }) {
  const profit = status === 'lost' ? -stake : status === 'push' ? 0 : (payout - stake);
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
    const statType = playerProp.statType ? formatStatType(playerProp.statType) : '';
    const lineStr = typeof line === 'number' ? ` ${Math.abs(line)}` : '';
    return `${playerProp.playerName}\n${sel}${lineStr} ${statType}`.trim();
  }

  // Handle game props
  if (betType === 'game_prop' && gameProp) {
    const sel = selection.toUpperCase();
    const lineStr = typeof line === 'number' ? ` ${Math.abs(line)}` : '';
    // Add period/quarter/half info if present
    let periodInfo = '';
    if (gameProp.marketCategory) {
      // Example: '1P', '2P', '1Q', '2H', etc.
      periodInfo = ` ${gameProp.marketCategory.toUpperCase()}`;
    }
    
    // Replace HOME/AWAY with actual team names in description
    let description = gameProp.description || gameProp.propType || '';
    if (game) {
      // Replace "Home" or "HOME" with actual home team name
      if (game.homeTeam?.shortName) {
        description = description.replace(/\b(Home|HOME)\b/g, game.homeTeam.shortName);
      }
      // Replace "Away" or "AWAY" with actual away team name
      if (game.awayTeam?.shortName) {
        description = description.replace(/\b(Away|AWAY)\b/g, game.awayTeam.shortName);
      }
    }
    
    return `${description} ${sel}${lineStr}${periodInfo}`.trim();
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
  actualResult,
  children,
  showTotals = true,
  headerActions,
}: BetCardSingleProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  return (
    <Card
      className={cn(
        "w-full max-w-full mx-auto touch-pan-y select-none",
        isWon
          ? "border-border/30 ring-1 ring-white/10"
          : status === "lost"
          ? "border-destructive/50 ring-1 ring-white/10"
          : "border-accent/20 ring-1 ring-accent/10"
      )}
      style={{
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
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
                isWon
                  ? "bg-green-600 text-white"
                  : status === "lost"
                  ? "bg-red-600 text-white"
                  : status === "push"
                  ? "bg-blue-500 text-white"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
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
              {betType === 'player_prop'
                ? 'PLAYER PROP'
                : betType === 'game_prop'
                ? 'GAME PROP'
                : betType.toUpperCase()}
            </Badge>
            {/* Result badge - positioned next to bet type badge */}
            {actualResult && status !== 'pending' && (
              <span className="text-[10px] sm:text-[11px] font-medium">
                {renderColorCodedResult(actualResult, betType, status, line, selection)}
              </span>
            )}
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
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              {/* Selection content, vertically centered */}
              <div className="flex flex-col min-w-0 justify-center items-start">
                <div className="flex flex-col items-start justify-center py-4">
                  {/* Game Matchup - Centered */}
                  {game?.awayTeam?.shortName && game?.homeTeam?.shortName && (
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground/50 uppercase tracking-[0.06em] font-semibold leading-tight mb-2">
                      {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                    </div>
                  )}
                  {/* Bet Selection - Centered */}
                  <div className="font-bold text-[15px] sm:text-base leading-tight text-white mb-2">
                    {betType === 'player_prop' && playerProp
                      ? playerProp.playerName
                      : betType === 'game_prop' && gameProp
                      ? gameProp.description || gameProp.propType
                      : formatSelectionLabel(betType, selection, line, game, playerProp)}
                  </div>
                  {/* Selection details cleaned: only statType and marketCategory if present */}
                  <div className="flex items-center gap-2 justify-start min-h-6">
                    {playerProp?.statType && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-semibold uppercase tracking-[0.05em]">
                        {formatStatType(playerProp.statType)}
                      </span>
                    )}
                    {gameProp?.marketCategory && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-semibold uppercase tracking-[0.05em]">
                        {gameProp.marketCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Odds Badge - aligned with selection */}
            <div className="flex flex-col items-center justify-center">
              <Badge
                variant="outline"
                className="text-base sm:text-lg font-bold px-2.5 py-1 shrink-0 tabular-nums border-2"
              >
                {formatOdds(odds)}
              </Badge>
            </div>
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
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : status === "push" ? "bg-blue-500 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
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
              PARLAY
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
        <div className="space-y-1.5 mb-2.5 bg-background/30 rounded-md p-2.5">
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
                  {/* Player Prop Enhanced Display */}
                  {leg.betType === 'player_prop' && leg.playerProp ? (
                    <div className="space-y-0.5">
                      {/* Player Name */}
                      <div className="text-[13px] sm:text-sm font-bold leading-tight text-white">
                        {leg.playerProp.playerName}
                      </div>
                      {/* Selection, Line, Stat Type */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-accent">
                          {leg.selection}
                        </span>
                        {typeof leg.line === 'number' && (
                          <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums">
                            {Math.abs(leg.line)}
                          </span>
                        )}
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-[0.05em]">
                          {leg.playerProp.statType ? formatStatType(leg.playerProp.statType) : ''}
                        </span>
                      </div>
                    </div>
                  ) : leg.betType === 'game_prop' && leg.gameProp ? (
                    /* Game Prop Enhanced Display */
                    <div className="space-y-0.5">
                      {/* Prop Description */}
                      <div className="text-[13px] sm:text-sm font-bold leading-tight text-white">
                        {leg.gameProp.description || leg.gameProp.propType}
                      </div>
                      {/* Selection, Line */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-accent">
                          {leg.selection}
                        </span>
                        {typeof leg.line === 'number' && (
                          <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums">
                            {Math.abs(leg.line)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular Bet Display */
                    <div className="text-[13px] sm:text-sm font-bold leading-tight text-white">
                      {formatSelectionLabel(leg.betType, leg.selection, leg.line, leg.game, leg.playerProp, leg.gameProp)}
                    </div>
                  )}
                  {/* Actual Result - Show for settled parlay legs */}
                  {leg.actualResult && status !== 'pending' && (
                    <div className="mt-0.5 text-[9px] sm:text-[10px] font-medium">
                      <span className="text-muted-foreground/50">Result: </span>
                      <span>{renderColorCodedResult(leg.actualResult, leg.betType, status, leg.line, leg.selection)}</span>
                    </div>
                  )}
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

export type BetCardTeaserProps = BetCardBaseProps & {
  stake: number;
  payout: number;
  legs: BetLeg[];
  teaserType?: string;
  teaserMetadata?: {
    adjustedLines?: Record<string, number>;
    originalLines?: Record<string, number>;
    pointAdjustment?: number;
    pushRule?: string;
  };
  children?: ReactNode;
  showTotals?: boolean;
  headerActions?: ReactNode;
};

export function BetCardTeaser({
  placedAt,
  status,
  stake,
  payout,
  legs,
  teaserType,
  teaserMetadata,
  children,
  showTotals = true,
  headerActions,
}: BetCardTeaserProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  const pointAdjustment = teaserMetadata?.pointAdjustment || 6;
  
  return (
    <Card 
      className={cn(
        "w-full max-w-full mx-auto",
        "touch-pan-y select-none",
        "bg-card/40 border-2 border-blue-500/30 ring-2 ring-blue-500/20 overflow-hidden",
      )}
      style={{
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Teaser Indicator Badge */}
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-3 py-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-400 font-semibold">
            ⚡ {pointAdjustment > 0 ? '+' : ''}{pointAdjustment} Point Teaser
          </span>
          <span className="text-muted-foreground">
            {teaserType || 'TEASER'}
          </span>
        </div>
      </div>

      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        {/* Header: Badges and Date */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} 
              className={cn(
                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em]",
                isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : status === "push" ? "bg-blue-500 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"
              )}
            >
              {status.toUpperCase()}
            </Badge>
            <Badge 
              variant="outline"
              className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-[0.06em] bg-blue-500/10 text-blue-400 border-blue-500/30"
            >
              TEASER
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 tabular-nums">
              {placed ? placed.toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        {/* Teaser Legs */}
        <div className="space-y-3 mb-2.5">
          {legs.map((leg, idx) => {
            if (!leg.game?.awayTeam?.shortName || !leg.game?.homeTeam?.shortName) {
              return null;
            }
            
            // The leg.line contains the ADJUSTED line (what was saved to DB after teaser adjustment)
            // We need to calculate the ORIGINAL line by reversing the adjustment
            const adjustedLine = leg.line;
            let originalLine: number | undefined = undefined;
            
            if (adjustedLine !== undefined && adjustedLine !== null) {
              const isSpread = leg.betType === 'spread';
              const isTotal = leg.betType === 'total';
              
              if (isSpread) {
                // For spread: adjusted = original + pointAdjustment, so original = adjusted - pointAdjustment
                originalLine = adjustedLine - pointAdjustment;
              } else if (isTotal) {
                // For totals: 
                // - Over: adjusted = original - pointAdjustment, so original = adjusted + pointAdjustment
                // - Under: adjusted = original + pointAdjustment, so original = adjusted - pointAdjustment
                if (leg.selection === 'over') {
                  originalLine = adjustedLine + pointAdjustment;
                } else if (leg.selection === 'under') {
                  originalLine = adjustedLine - pointAdjustment;
                }
              }
            }
            
            // Determine which team was selected
            const selectedTeam = leg.selection === 'home' ? leg.game.homeTeam.shortName : 
                               leg.selection === 'away' ? leg.game.awayTeam.shortName : 
                               null;
            
            // Format the line display
            const formatLine = (line: number | undefined, isSpread: boolean) => {
              if (line === undefined || line === null) return '';
              if (isSpread) {
                return line > 0 ? `+${line}` : line.toString();
              }
              return line.toString();
            };
            
            const isSpread = leg.betType === 'spread';
            const isTotal = leg.betType === 'total';
            const originalFormatted = formatLine(originalLine, isSpread);
            const adjustedFormatted = formatLine(adjustedLine, isSpread);
            
            // Build title based on bet type - USE ADJUSTED LINE
            let title = '';
            if (isSpread && selectedTeam) {
              title = `${selectedTeam} ${adjustedFormatted}`;
            } else if (isTotal) {
              const totalLabel = leg.selection === 'over' ? 'O' : leg.selection === 'under' ? 'U' : '';
              title = `${totalLabel} ${adjustedFormatted}`;
            }
            
            return (
              <div key={idx} className="pb-3 border-b border-border/20 last:border-0 last:pb-0">
                {/* Title: "PHI +3" (adjusted line) */}
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-base text-white">
                    {title}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-bold px-1.5 py-0.5 tabular-nums border"
                  >
                    {formatOdds(leg.odds)}
                  </Badge>
                </div>
                
                {/* Adjusted line: "-1 → +3 (+4 pts)" */}
                {originalFormatted && adjustedFormatted && (
                  <div className="text-sm mb-1">
                    <span className="text-muted-foreground/70">{originalFormatted}</span>
                    <span className="text-muted-foreground/50 mx-1">→</span>
                    <span className="text-blue-400 font-semibold">{adjustedFormatted}</span>
                    <span className="text-blue-400/70 ml-1">(+{pointAdjustment} pts)</span>
                  </div>
                )}
                
                {/* Game matchup: "BOS @ PHI" */}
                <div className="text-xs text-muted-foreground/60">
                  {leg.game.awayTeam.shortName} @ {leg.game.homeTeam.shortName}
                </div>
                
                {/* Actual Result - Show for settled teasers */}
                {leg.actualResult && status !== 'pending' && (
                  <div className="mt-0.5 text-[9px] sm:text-[10px] font-medium">
                    <span className="text-muted-foreground/50">Result: </span>
                    <span>{renderColorCodedResult(leg.actualResult, leg.betType, status, leg.line, leg.selection)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-border/20 text-center text-[10px] text-blue-400/70">
          Lines adjusted by <span className="font-semibold">{pointAdjustment > 0 ? '+' : ''}{pointAdjustment} pts</span>
          {teaserMetadata?.pushRule && (
            <span className="ml-2">• Push: <span className="font-semibold">{teaserMetadata.pushRule}</span></span>
          )}
        </div>

        {children}
        {showTotals && <BetSummary stake={stake} payout={payout} status={status} />}
      </CardContent>
    </Card>
  );
}
