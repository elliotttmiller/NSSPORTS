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
    const wraps = [stakeWrapRef.current, profitWrapRef.current, payoutWrapRef.current];
    const spans = [stakeSpanRef.current, profitSpanRef.current, payoutSpanRef.current];
    const row = rowRef.current;
    if (!row || wraps.some(w => !w) || spans.some(s => !s)) return;

    const measure = () => {
      let minScale = 1;
      for (let i = 0; i < wraps.length; i++) {
        const wrap = wraps[i]!;
        const span = spans[i]!;
        // Reset before measuring
        span.style.transform = `scale(1)`;
        const available = wrap.clientWidth;
        const needed = span.scrollWidth;
        if (available > 0 && needed > 0) {
          const s = Math.min(1, available / needed);
          if (s < minScale) minScale = s;
        }
      }
      setScale(minScale);
      // Apply immediately to avoid flicker
      for (let i = 0; i < spans.length; i++) {
        spans[i]!.style.transform = `scale(${minScale})`;
      }
    };

    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    wraps.forEach(w => w && ro.observe(w));
    measure();
    const onWin = () => measure();
    window.addEventListener('resize', onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
    };
  }, [stake, payout, status]);

  return (
    <div className="pt-3 border-t border-border/50">
  <div ref={rowRef} className="grid grid-cols-3 gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-muted-foreground">Stake</span>
          <div ref={stakeWrapRef} className="w-full overflow-hidden pl-1 sm:pl-0">
            <span
              ref={stakeSpanRef}
              className="inline-block whitespace-nowrap tabular-nums font-semibold leading-tight"
              style={{ transformOrigin: 'left center' }}
            >
              {formatCurrencyNoCents(stake)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 items-center text-center">
          <span className="text-xs text-muted-foreground">Profit</span>
          {(() => {
            const profit = status === 'lost' ? -stake : (payout - stake);
            const sign = profit > 0 ? '+' : '';
            const color = profit >= 0 ? "text-accent" : "text-destructive";
            return (
              <div ref={profitWrapRef} className="w-full overflow-hidden">
                <span
                  ref={profitSpanRef}
                  className={cn("inline-block whitespace-nowrap tabular-nums font-bold leading-tight", color)}
                  style={{ transformOrigin: 'center center' }}
                >
                  {`${sign}${formatCurrencyNoCents(profit)}`}
                </span>
              </div>
            );
          })()}
        </div>
        <div className="flex flex-col gap-0.5 items-end text-right min-w-0">
          <span className="text-xs text-muted-foreground">Payout</span>
          <div ref={payoutWrapRef} className="w-full overflow-hidden pr-1 sm:pr-0">
            <span
              ref={payoutSpanRef}
              className="inline-block whitespace-nowrap tabular-nums font-semibold leading-tight"
              style={{ transformOrigin: 'right center' }}
            >
              {formatCurrencyNoCents(status !== 'lost' ? payout : 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Infer bet type from selection/line when not provided
function inferBetType(selection: string, line?: number): 'spread' | 'moneyline' | 'total' {
  if (selection === 'over' || selection === 'under') return 'total';
  if (line === null || typeof line === 'undefined') return 'moneyline';
  return 'spread';
}

function formatSelectionLabel(
  betType: string | undefined,
  selection: string,
  line: number | undefined,
  game?: { homeTeam?: { shortName?: string }; awayTeam?: { shortName?: string } }
) {
  const type = (betType as any) ?? inferBetType(selection, line);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  if (type === 'total') {
  // For totals, do not show a leading plus sign, e.g., "Over 218.5" not "+218.5"
  return `${cap(selection)} ${typeof line === 'number' ? `${line}` : ''}`.trim();
  }
  if (type === 'moneyline') {
    const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
    return `${team ?? cap(selection)} Win`;
  }
  // spread
  const sign = typeof line === 'number' && line > 0 ? '+' : '';
  return `${cap(selection)} ${typeof line === 'number' ? `${sign}${line}` : ''}`.trim();
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
          <div className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-4">
            <div className="font-semibold text-base md:text-lg leading-6 text-white truncate row-start-1 col-start-1">
              {game?.awayTeam?.shortName} / {game?.homeTeam?.shortName}
            </div>
            <div className="text-sm text-muted-foreground mt-3 md:mt-1 row-start-2 col-start-1">
              {formatSelectionLabel(betType, selection, line, game)}
            </div>
            <div className="row-start-2 col-start-2 self-center">
              <Badge variant="outline" className="text-base md:text-lg px-3 py-1 font-semibold">{formatOdds(odds)}</Badge>
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

export function BetCardParlay({ placedAt, status, stake, payout, legs, children, showTotals = true, headerActions }: BetCardParlayProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  return (
    <Card className={cn(
      "border-accent/20",
      isWon ? "border-green-200/50 ring-2 ring-green-100" : status === "lost" ? "border-red-200/50 ring-2 ring-red-100" : "ring-1 ring-accent/10",
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant={isWon ? "default" : "outline"} className={isWon ? "bg-green-100 text-green-800 border-green-200" : ""}>PARLAY</Badge>
            <Badge variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} className={isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>{status.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <span className="text-xs text-muted-foreground">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="text-sm font-medium text-foreground mb-3">Parlay ({legs.length} picks)</div>
        <div className="space-y-2 mb-4 bg-background/50 rounded-lg p-3">
          {legs.map((leg, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] py-1 gap-x-3">
              <div className="text-xs text-muted-foreground row-start-1 col-start-1">
                {leg.game?.awayTeam?.shortName} / {leg.game?.homeTeam?.shortName}
              </div>
              <div className="text-sm font-medium leading-5 truncate row-start-2 col-start-1">
                {formatSelectionLabel(leg.betType, leg.selection, leg.line, leg.game)}
              </div>
              <div className="row-start-2 col-start-2 self-center">
                <Badge variant="outline" className="text-base md:text-lg px-3 py-1 font-semibold">{formatOdds(leg.odds)}</Badge>
              </div>
            </div>
          ))}
        </div>
  {children}
  {showTotals && <BetSummary stake={stake} payout={payout} status={status} />}
      </CardContent>
    </Card>
  );
}
