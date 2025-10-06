"use client";

import { Badge, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatCurrencyNoCents, formatOdds } from "@/lib/formatters";

export type BetStatus = "pending" | "won" | "lost";

export type BetLeg = {
  game?: {
    homeTeam?: { shortName?: string };
    awayTeam?: { shortName?: string };
  };
  selection: string; // 'home' | 'away' | 'over' | 'under'
  odds: number;
  line?: number;
  betType?: string; // optional: 'spread' | 'moneyline' | 'total'
};

export type BetCardBaseProps = {
  id: string;
  betType: string;
  placedAt?: string | Date | null;
  status: BetStatus;
};

function BetSummary({ stake, payout, status }: { stake: number; payout: number; status: BetStatus }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const stakeWrapRef = useRef<HTMLDivElement | null>(null);
  const stakeSpanRef = useRef<HTMLSpanElement | null>(null);
  const profitWrapRef = useRef<HTMLDivElement | null>(null);
  const profitSpanRef = useRef<HTMLSpanElement | null>(null);
  const payoutWrapRef = useRef<HTMLDivElement | null>(null);
  const payoutSpanRef = useRef<HTMLSpanElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // You can add responsive scaling logic here if needed
  }, [stake, payout, status]);

  return (
    <div className="pt-3 border-t border-border/50">
      <div ref={rowRef} className="grid grid-cols-3 gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-xs text-muted-foreground text-center">Stake</span>
          <div ref={stakeWrapRef} className="w-full overflow-hidden flex justify-center">
            <span
              ref={stakeSpanRef}
              className="inline-block whitespace-nowrap tabular-nums font-semibold leading-tight text-center origin-center"
            >
              {formatCurrencyNoCents(stake)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-xs text-muted-foreground text-center">Profit</span>
          <div ref={profitWrapRef} className="w-full overflow-hidden flex justify-center">
            <span
              ref={profitSpanRef}
              className="inline-block whitespace-nowrap tabular-nums font-semibold leading-tight text-center origin-center"
            >
              {(() => {
                const profit = status === 'lost' ? -stake : (payout - stake);
                const sign = profit > 0 ? '+' : '';
                return `${sign}${formatCurrencyNoCents(profit)}`;
              })()}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-xs text-muted-foreground text-center">Payout</span>
          <div ref={payoutWrapRef} className="w-full overflow-hidden flex justify-center">
            <span
              ref={payoutSpanRef}
              className="inline-block whitespace-nowrap tabular-nums font-semibold leading-tight text-center origin-center"
            >
              {formatCurrencyNoCents(status !== 'lost' ? payout : 0)}
            </span>
          </div>
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
  game?: { homeTeam?: { shortName?: string }; awayTeam?: { shortName?: string } }
) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const isSide = selection === 'home' || selection === 'away';
  const isTotal = selection === 'over' || selection === 'under';

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
  children,
  showTotals = true,
  headerActions,
}: BetCardSingleProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  return (
    <Card className={cn(
      "w-full max-w-[95vw] mx-auto",
      isWon
        ? "border-border/30 ring-1 ring-white/10"
        : status === "lost"
        ? "border-destructive/50 ring-1 ring-white/10"
        : "border-accent/20 ring-1 ring-accent/10"
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={isWon ? "default" : "outline"} className={isWon ? "bg-accent/10 text-accent border-accent/30" : ""}>
              {betType.toUpperCase()}
            </Badge>
            <Badge variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} className={isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <span className="text-xs text-muted-foreground">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <div className="font-semibold text-base md:text-lg leading-tight text-white truncate mb-1">
                {formatSelectionLabel(betType, selection, line, game)}
              </div>
              <div className="text-sm text-muted-foreground leading-tight">
                {game?.awayTeam?.shortName} @ {game?.homeTeam?.shortName}
              </div>
            </div>
            <Badge variant="outline" className="text-base md:text-lg px-3 py-1 font-light">{formatOdds(odds)}</Badge>
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
      "w-full max-w-[95vw] mx-auto border-accent/20",
      isWon ? "border-green-200/50 ring-2 ring-green-100" : status === "lost" ? "border-red-200/50 ring-2 ring-red-100" : "ring-1 ring-accent/10",
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Badge variant={isWon ? "default" : "outline"} className={cn(isWon ? "bg-green-100 text-green-800 border-green-200" : "", "flex items-center gap-0.5 px-3 py-1")}>
              PARLAY
            </Badge>
            <Badge variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} className={cn(isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200", "ml-1")}>
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {headerActions}
            <span className="text-xs text-muted-foreground">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="space-y-2 mb-4 bg-background/50 rounded-lg p-3">
          {legs.map((leg, idx) => (
            <div key={idx} className="flex items-start justify-between py-1">
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-sm font-medium leading-tight truncate mb-1">
                  {formatSelectionLabel(leg.betType, leg.selection, leg.line, leg.game)}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {leg.game?.awayTeam?.shortName} @ {leg.game?.homeTeam?.shortName}
                </div>
              </div>
              <Badge variant="outline" className="text-base md:text-lg px-3 py-1 font-light">{formatOdds(leg.odds)}</Badge>
            </div>
          ))}
        </div>
        {children}
        {showTotals && <BetSummary stake={stake} payout={payout} status={status} />}
      </CardContent>
    </Card>
  );
}
