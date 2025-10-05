"use client";

import { Badge, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { formatCurrency, formatOdds } from "@/lib/formatters";

export type BetStatus = "pending" | "won" | "lost";

export type BetLeg = {
  game?: {
    homeTeam?: { shortName?: string };
    awayTeam?: { shortName?: string };
  };
  betType?: string;
  selection: string;
  odds: number;
  line?: number;
  displaySelection?: string;
};

export type BetCardBaseProps = {
  id: string;
  betType: string;
  placedAt?: string | Date | null;
  status: BetStatus;
};

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
  displaySelection?: string; // Canonical API-provided label (preferred when present)
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
  displaySelection,
}: BetCardSingleProps) {
  const placed = placedAt ? new Date(placedAt) : null;
  const isWon = status === "won";
  const computedSelection = (() => {
    const s = (selection || "").toString();
    const lower = s.toLowerCase();
    const market = (betType || "").toString().toLowerCase();
    if (market === "moneyline") {
  let team: string | undefined;
  if (lower === "home") team = game?.homeTeam?.shortName;
  else if (lower === "away") team = game?.awayTeam?.shortName;
      const selLabel = lower === "home" ? "Home" : lower === "away" ? "Away" : s.charAt(0).toUpperCase() + s.slice(1);
      return `${team ?? selLabel} Win`;
    }
    const lineSuffix = typeof line === "number" ? ` ${line > 0 ? "+" : ""}${line}` : "";
    if (lower === "over") return `Over${lineSuffix}`;
    if (lower === "under") return `Under${lineSuffix}`;
    if (lower === "home") return `Home${lineSuffix}`;
    if (lower === "away") return `Away${lineSuffix}`;
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const finalSelection = displaySelection && displaySelection.length > 0 ? displaySelection : computedSelection;
  return (
    <Card className={cn(
      "border-border/50",
      isWon ? "border-green-200/50 ring-2 ring-green-100" : status === "lost" ? "border-red-200/50 ring-2 ring-red-100" : "",
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={isWon ? "default" : "outline"} className={isWon ? "bg-green-100 text-green-800 border-green-200" : ""}>
              {betType.toUpperCase()}
            </Badge>
            <Badge variant={isWon ? "default" : status === "lost" ? "destructive" : "outline"} className={isWon ? "bg-green-600 text-white" : status === "lost" ? "bg-red-600 text-white" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <span className="text-xs text-foreground/70">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-foreground/80 truncate">
                {game?.awayTeam?.shortName} @ {game?.homeTeam?.shortName}
              </div>
              <div className="text-[10px] text-foreground/60 uppercase tracking-wide mt-0.5">{betType}</div>
              <div className="font-medium text-base mt-4">
                {finalSelection}
              </div>
            </div>
            <div className="shrink-0 self-center">
              <Badge variant="outline" className="text-sm md:text-base font-medium px-2 py-0.5">{formatOdds(odds)}</Badge>
            </div>
          </div>
        </div>
  {children}
  {showTotals && (
  <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground/80">Stake:</span>
            <span className="text-sm font-semibold">{formatCurrency(stake)}</span>
          </div>
          {status !== "lost" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Payout:</span>
                <span className="text-sm font-semibold">{formatCurrency(payout)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Profit:</span>
                <span className="text-sm font-bold text-green-600">+{formatCurrency(payout - stake)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Loss:</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(-stake)}</span>
            </div>
          )}
  </div>
  )}
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
            <span className="text-xs text-foreground/70">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="text-sm font-medium text-foreground mb-3">Parlay ({legs.length} picks)</div>
        <div className="space-y-2 mb-4 bg-background/50 rounded-lg p-3">
          {legs.map((leg, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 gap-3">
              <div className="min-w-0">
                <div className="text-xs text-foreground/80 truncate">
                  {leg.game?.awayTeam?.shortName} @ {leg.game?.homeTeam?.shortName}
                </div>
                <div className="text-sm font-medium text-foreground mt-2 truncate">
                  {leg.displaySelection ?? (() => {
                    const sel = (leg.selection || "").toString();
                    const lower = sel.toLowerCase();
                    const hasLine = typeof leg.line === "number";
                    const market = (leg.betType || "").toString().toLowerCase();
                    if (market === "moneyline") {
                      let team: string | undefined;
                      if (lower === "home") team = leg.game?.homeTeam?.shortName;
                      else if (lower === "away") team = leg.game?.awayTeam?.shortName;
                      const selLabel = lower === "home" ? "Home" : lower === "away" ? "Away" : sel.charAt(0).toUpperCase() + sel.slice(1);
                      return `${team ?? selLabel} Win`;
                    }
                    const label = sel.charAt(0).toUpperCase() + sel.slice(1);
                    return (
                      <>
                        {label}
                        {hasLine ? ` ${leg.line! > 0 ? "+" : ""}${leg.line}` : ""}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="shrink-0 self-center">
                <Badge variant="outline" className="text-sm md:text-base px-2 py-0.5">{formatOdds(leg.odds)}</Badge>
              </div>
            </div>
          ))}
        </div>
  {children}
  {showTotals && (
  <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground/80">Total Stake:</span>
            <span className="text-sm font-semibold">{formatCurrency(stake)}</span>
          </div>
          {status !== "lost" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Potential Payout:</span>
                <span className="text-sm font-semibold text-accent">{formatCurrency(payout)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Potential Profit:</span>
                <span className="text-sm font-bold text-accent">{formatCurrency(payout - stake)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Loss:</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(-(stake))}</span>
            </div>
          )}
  </div>
  )}
      </CardContent>
    </Card>
  );
}
