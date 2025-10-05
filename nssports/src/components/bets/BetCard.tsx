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
  selection: string;
  odds: number;
  line?: number;
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
            <span className="text-xs text-muted-foreground">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{betType}</div>
          <div className="font-medium text-base mb-1">
            {selection === "over" ? "Over" : selection === "under" ? "Under" : selection}
            {typeof line === "number" ? ` ${line > 0 ? "+" : ""}${line}` : ""}
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {game?.awayTeam?.shortName} @ {game?.homeTeam?.shortName}
          </div>
          <Badge variant="outline" className="text-xs font-medium">{formatOdds(odds)}</Badge>
        </div>
  {children}
  {showTotals && (
  <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Stake:</span>
            <span className="text-sm font-semibold">{formatCurrency(stake)}</span>
          </div>
          {status !== "lost" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payout:</span>
                <span className="text-sm font-semibold">{formatCurrency(payout)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profit:</span>
                <span className="text-sm font-bold text-green-600">+{formatCurrency(payout - stake)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Loss:</span>
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
            <span className="text-xs text-muted-foreground">{placed ? placed.toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div className="text-sm font-medium text-foreground mb-3">Parlay ({legs.length} picks)</div>
        <div className="space-y-2 mb-4 bg-background/50 rounded-lg p-3">
          {legs.map((leg, idx) => (
            <div key={idx} className="flex items-center justify-between py-1">
              <div className="text-xs text-muted-foreground">
                {leg.game?.awayTeam?.shortName} @ {leg.game?.homeTeam?.shortName}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {leg.selection.charAt(0).toUpperCase() + leg.selection.slice(1)}
                  {typeof leg.line === "number" ? ` ${leg.line > 0 ? "+" : ""}${leg.line}` : ""}
                </span>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">{formatOdds(leg.odds)}</Badge>
              </div>
            </div>
          ))}
        </div>
  {children}
  {showTotals && (
  <div className="space-y-2 pt-3 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Stake:</span>
            <span className="text-sm font-semibold">{formatCurrency(stake)}</span>
          </div>
          {status !== "lost" ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Potential Payout:</span>
                <span className="text-sm font-semibold text-accent">{formatCurrency(payout)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Potential Profit:</span>
                <span className="text-sm font-bold text-accent">{formatCurrency(payout - stake)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Loss:</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(-(stake))}</span>
            </div>
          )}
  </div>
  )}
      </CardContent>
    </Card>
  );
}
