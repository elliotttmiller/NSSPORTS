/**
 * Multi-Book Comparison Component
 * 
 * Displays odds from multiple sportsbooks side-by-side
 * for easy line shopping and arbitrage detection
 * 
 * NOTE: This component requires odds from multiple sportsbooks.
 * Currently simplified for initial release.
 */

"use client";

import { Card } from "@/components/ui/card";
import type { Game } from "@/types";

export interface SportsbookOdds extends Game {
  sportsbook: string;
}

export interface MultiBookComparisonProps {
  matchup: string; // e.g., "Lakers vs Celtics"
  sportsbookOdds: SportsbookOdds[];
  betType: 'spread' | 'moneyline' | 'total';
}

export function MultiBookComparison({ matchup, sportsbookOdds, betType }: MultiBookComparisonProps) {
  if (sportsbookOdds.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-sm">No odds available for comparison</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">{matchup}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Comparing {sportsbookOdds.length} sportsbook{sportsbookOdds.length > 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="space-y-4">
        {sportsbookOdds.map((odds, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-card border border-border">
            <div className="font-medium mb-2">{odds.sportsbook}</div>
            
            {betType === 'spread' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Home: </span>
                  <span className="font-semibold">
                    {odds.odds?.spread?.home?.line != null && (
                      `${odds.odds.spread.home.line > 0 ? '+' : ''}${odds.odds.spread.home.line}`
                    )}
                    {odds.odds?.spread?.home?.odds != null && (
                      ` (${odds.odds.spread.home.odds > 0 ? '+' : ''}${odds.odds.spread.home.odds})`
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Away: </span>
                  <span className="font-semibold">
                    {odds.odds?.spread?.away?.line != null && (
                      `${odds.odds.spread.away.line > 0 ? '+' : ''}${odds.odds.spread.away.line}`
                    )}
                    {odds.odds?.spread?.away?.odds != null && (
                      ` (${odds.odds.spread.away.odds > 0 ? '+' : ''}${odds.odds.spread.away.odds})`
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {betType === 'moneyline' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Home: </span>
                  <span className="font-semibold">
                    {odds.odds?.moneyline?.home?.odds != null && (
                      `${odds.odds.moneyline.home.odds > 0 ? '+' : ''}${odds.odds.moneyline.home.odds}`
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Away: </span>
                  <span className="font-semibold">
                    {odds.odds?.moneyline?.away?.odds != null && (
                      `${odds.odds.moneyline.away.odds > 0 ? '+' : ''}${odds.odds.moneyline.away.odds}`
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {betType === 'total' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Over: </span>
                  <span className="font-semibold">
                    {odds.odds?.total?.home?.line != null && `${odds.odds.total.home.line} `}
                    {odds.odds?.total?.home?.odds != null && (
                      `(${odds.odds.total.home.odds > 0 ? '+' : ''}${odds.odds.total.home.odds})`
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Under: </span>
                  <span className="font-semibold">
                    {odds.odds?.total?.away?.line != null && `${odds.odds.total.away.line} `}
                    {odds.odds?.total?.away?.odds != null && (
                      `(${odds.odds.total.away.odds > 0 ? '+' : ''}${odds.odds.total.away.odds})`
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Best odds</strong> can be identified by comparing the values above. 
          Line shopping across multiple sportsbooks can significantly improve your long-term profitability.
        </p>
      </div>
    </Card>
  );
}
