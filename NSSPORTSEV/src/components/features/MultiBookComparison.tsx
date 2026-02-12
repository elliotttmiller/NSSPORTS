/**
 * Multi-Book Comparison Component
 * 
 * Displays odds from multiple sportsbooks side-by-side
 * for easy line shopping and arbitrage detection
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@/types/game";

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
  
  // Find best odds for each side
  const findBestOdds = (getter: (odds: SportsbookOdds) => number | undefined) => {
    const validOdds = sportsbookOdds
      .map(odds => ({ sportsbook: odds.sportsbook, value: getter(odds) }))
      .filter(o => o.value !== undefined) as Array<{ sportsbook: string; value: number }>;
    
    if (validOdds.length === 0) return null;
    
    return validOdds.reduce((best, curr) => 
      curr.value > best.value ? curr : best
    );
  };
  
  const renderSpreadComparison = () => {
    const bestHome = findBestOdds(o => o.homeSpreadOdds);
    const bestAway = findBestOdds(o => o.awaySpreadOdds);
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Home Spread
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.homeSpreadOdds && bestHome && odds.homeSpreadOdds === bestHome.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.homeSpreadOdds && bestHome && odds.homeSpreadOdds === bestHome.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {odds.homeSpread !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {odds.homeSpread > 0 ? '+' : ''}{odds.homeSpread}
                    </span>
                  )}
                  {odds.homeSpreadOdds !== undefined && (
                    <span className="font-semibold">
                      {odds.homeSpreadOdds > 0 ? '+' : ''}{odds.homeSpreadOdds}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Away Spread
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.awaySpreadOdds && bestAway && odds.awaySpreadOdds === bestAway.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.awaySpreadOdds && bestAway && odds.awaySpreadOdds === bestAway.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {odds.awaySpread !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {odds.awaySpread > 0 ? '+' : ''}{odds.awaySpread}
                    </span>
                  )}
                  {odds.awaySpreadOdds !== undefined && (
                    <span className="font-semibold">
                      {odds.awaySpreadOdds > 0 ? '+' : ''}{odds.awaySpreadOdds}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderMoneylineComparison = () => {
    const bestHome = findBestOdds(o => o.homeMoneylineOdds);
    const bestAway = findBestOdds(o => o.awayMoneylineOdds);
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Home Moneyline
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.homeMoneylineOdds && bestHome && odds.homeMoneylineOdds === bestHome.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.homeMoneylineOdds && bestHome && odds.homeMoneylineOdds === bestHome.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                {odds.homeMoneylineOdds !== undefined && (
                  <span className="font-semibold">
                    {odds.homeMoneylineOdds > 0 ? '+' : ''}{odds.homeMoneylineOdds}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Away Moneyline
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.awayMoneylineOdds && bestAway && odds.awayMoneylineOdds === bestAway.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.awayMoneylineOdds && bestAway && odds.awayMoneylineOdds === bestAway.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                {odds.awayMoneylineOdds !== undefined && (
                  <span className="font-semibold">
                    {odds.awayMoneylineOdds > 0 ? '+' : ''}{odds.awayMoneylineOdds}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderTotalComparison = () => {
    const bestOver = findBestOdds(o => o.overOdds);
    const bestUnder = findBestOdds(o => o.underOdds);
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Over
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.overOdds && bestOver && odds.overOdds === bestOver.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.overOdds && bestOver && odds.overOdds === bestOver.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {odds.totalPoints !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      O {odds.totalPoints}
                    </span>
                  )}
                  {odds.overOdds !== undefined && (
                    <span className="font-semibold">
                      {odds.overOdds > 0 ? '+' : ''}{odds.overOdds}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Under
          </h3>
          <div className="space-y-2">
            {sportsbookOdds.map((odds, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  odds.underOdds && bestUnder && odds.underOdds === bestUnder.value
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{odds.sportsbook}</span>
                  {odds.underOdds && bestUnder && odds.underOdds === bestUnder.value && (
                    <Badge variant="default" className="text-xs">Best</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {odds.totalPoints !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      U {odds.totalPoints}
                    </span>
                  )}
                  {odds.underOdds !== undefined && (
                    <span className="font-semibold">
                      {odds.underOdds > 0 ? '+' : ''}{odds.underOdds}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">{matchup}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Comparing {sportsbookOdds.length} sportsbook{sportsbookOdds.length > 1 ? 's' : ''}
        </p>
      </div>
      
      {betType === 'spread' && renderSpreadComparison()}
      {betType === 'moneyline' && renderMoneylineComparison()}
      {betType === 'total' && renderTotalComparison()}
      
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Best odds</strong> are highlighted in green. Line shopping across multiple
          sportsbooks can significantly improve your long-term profitability.
        </p>
      </div>
    </Card>
  );
}
