/**
 * Live Odds Dashboard Page
 * 
 * Real-time odds tracking with automated opportunity detection
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllMatches, useFetchAllMatches, useIsLoading } from "@/hooks/useStableLiveData";
import { getOpportunityDetector, type OpportunityAlert } from "@/lib/opportunity-detector";
import { getHistoricalTracker } from "@/lib/historical-tracker";
import { toast } from "sonner";
import type { Game } from "@/types";

export default function LiveOddsPage() {
  const matches = useAllMatches();
  const fetchMatches = useFetchAllMatches();
  const isLoading = useIsLoading();
  
  const [recentAlerts, setRecentAlerts] = useState<OpportunityAlert[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Initialize opportunity detector and historical tracker
  useEffect(() => {
    const detector = getOpportunityDetector({
      minEVPercent: 2.0,
      minEdge: 0.03,
      minArbitrageProfitPercent: 0.5,
      enableNotifications: true,
      maxAlertsPerMinute: 5,
    });
    
    // Subscribe to opportunity alerts
    const unsubscribe = detector.onOpportunity((alert) => {
      setRecentAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
      
      // Show toast notification
      const message = alert.type === 'ev' 
        ? `EV+ Opportunity: ${(alert.details as import("@/lib/opportunity-detector").EVOpportunity).expectedValuePercent.toFixed(2)}% edge detected!`
        : `Arbitrage Opportunity: ${(alert.details as import("@/lib/opportunity-detector").ArbitrageOpportunity).profitPercent.toFixed(2)}% profit detected!`;
      
      const gameDesc = alert.game.homeTeam && alert.game.awayTeam
        ? `${alert.game.homeTeam.name} vs ${alert.game.awayTeam.name}`
        : 'Game opportunity detected';
      
      toast.success(message, {
        description: gameDesc,
        duration: 10000,
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Start historical tracking
  const handleStartTracking = () => {
    const tracker = getHistoricalTracker();
    
    tracker.startTracking(
      async () => matches,
      15 // Take snapshot every 15 minutes
    );
    
    setIsTracking(true);
    toast.success('Historical tracking started', {
      description: 'Odds snapshots will be taken every 15 minutes',
    });
  };
  
  // Stop historical tracking
  const handleStopTracking = () => {
    const tracker = getHistoricalTracker();
    tracker.stopTracking();
    setIsTracking(false);
    toast.info('Historical tracking stopped');
  };
  
  // Toggle automated detection
  const handleToggleDetection = () => {
    setIsDetecting(!isDetecting);
    
    if (!isDetecting) {
      toast.success('Automated detection enabled', {
        description: 'You will receive alerts for EV+ and arbitrage opportunities',
      });
    } else {
      toast.info('Automated detection disabled');
    }
  };
  
  // Fetch matches on mount
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);
  
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Live Odds Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Real-time odds tracking with automated opportunity detection
          </p>
        </header>
        
        {/* Controls */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-[200px]">
              <Button
                onClick={isTracking ? handleStopTracking : handleStartTracking}
                variant={isTracking ? "default" : "outline"}
                className="w-full sm:w-auto"
                size="sm"
              >
                {isTracking ? '✅ Tracking Active' : 'Start Historical Tracking'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {isTracking 
                  ? 'Taking snapshots every 15 minutes for CLV analysis'
                  : 'Track line movements and calculate CLV'
                }
              </p>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Button
                onClick={handleToggleDetection}
                variant={isDetecting ? "default" : "outline"}
                className="w-full sm:w-auto"
                size="sm"
              >
                {isDetecting ? '✅ Detection Active' : 'Enable Auto-Detection'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {isDetecting
                  ? 'Monitoring for EV+ and arbitrage opportunities'
                  : 'Get alerts for profitable opportunities'
                }
              </p>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Button
                onClick={() => fetchMatches()}
                variant="outline"
                disabled={isLoading}
                className="w-full sm:w-auto"
                size="sm"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Odds'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Fetch latest odds from all leagues
              </p>
            </div>
          </div>
        </Card>
        
        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Recent Opportunities</h2>
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 rounded-lg bg-card border border-border gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant={alert.type === 'ev' ? 'default' : 'secondary'}
                      >
                        {alert.type === 'ev' ? 'EV+' : 'Arbitrage'}
                      </Badge>
                      <Badge
                        variant={
                          alert.priority === 'high' ? 'destructive' :
                          alert.priority === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {alert.priority}
                      </Badge>
                    </div>
                    
                    <p className="font-medium text-sm sm:text-base">
                      {alert.game.homeTeam?.name || 'Home'} vs {alert.game.awayTeam?.name || 'Away'}
                    </p>
                    
                    {alert.type === 'ev' && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        EV: {(alert.details as import("@/lib/opportunity-detector").EVOpportunity).expectedValuePercent.toFixed(2)}% • 
                        Edge: {((alert.details as import("@/lib/opportunity-detector").EVOpportunity).edge * 100).toFixed(2)}% • 
                        Kelly: {((alert.details as import("@/lib/opportunity-detector").EVOpportunity).kellyFraction * 100).toFixed(2)}%
                      </p>
                    )}
                    
                    {alert.type === 'arbitrage' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Profit: {(alert.details as import("@/lib/opportunity-detector").ArbitrageOpportunity).profitPercent.toFixed(2)}% • 
                        Arb%: {(alert.details as import("@/lib/opportunity-detector").ArbitrageOpportunity).arbitragePercent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Live Games */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Live Games ({matches.filter(m => m.status === 'live').length})
          </h2>
          
          {isLoading && matches.length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground">Loading games...</p>
            </Card>
          ) : matches.filter(m => m.status === 'live').length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground">No live games at the moment</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches
                .filter(m => m.status === 'live')
                .map((game) => (
                  <GameCard key={game.id} game={game} isDetecting={isDetecting} />
                ))}
            </div>
          )}
        </div>
        
        {/* Upcoming Games */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Upcoming Games ({matches.filter(m => m.status === 'upcoming').length})
          </h2>
          
          {matches.filter(m => m.status === 'upcoming').length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground">No upcoming games</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matches
                .filter(m => m.status === 'upcoming')
                .slice(0, 6)
                .map((game) => (
                  <GameCard key={game.id} game={game} isDetecting={isDetecting} />
                ))}
            </div>
          )}
        </div>
        
        {/* Feature Info */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Dashboard Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">🔴 Real-time Streaming</h3>
              <p className="text-sm text-muted-foreground">
                Odds update in real-time via WebSocket connection for sub-second latency
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">🎯 Auto-Detection</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detects EV+ and arbitrage opportunities with instant alerts
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">📊 Historical Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track line movements and calculate Closing Line Value (CLV) over time
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface GameCardProps {
  game: Game;
  isDetecting: boolean;
}

function GameCard({ game, isDetecting }: GameCardProps) {
  // Helper to safely access nested odds
  const homeSpread = game.odds?.spread?.home?.line;
  const homeSpreadOdds = game.odds?.spread?.home?.odds;
  const awaySpread = game.odds?.spread?.away?.line;
  const awaySpreadOdds = game.odds?.spread?.away?.odds;
  
  const homeML = game.odds?.moneyline?.home?.odds;
  const awayML = game.odds?.moneyline?.away?.odds;
  
  const total = game.odds?.total?.home?.line;
  const overOdds = game.odds?.total?.home?.odds;
  const underOdds = game.odds?.total?.away?.odds;
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Game Info */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Badge variant={game.status === 'live' ? 'destructive' : 'secondary'}>
              {game.status || 'upcoming'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(game.startTime).toLocaleString()}
            </span>
          </div>
          
          <h3 className="text-lg font-bold">
            {game.homeTeam?.name || 'Home Team'} vs {game.awayTeam?.name || 'Away Team'}
          </h3>
        </div>
        
        {/* Odds */}
        <div className="space-y-2">
          {/* Spread */}
          {homeSpread != null && awaySpread != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spread</span>
              <div className="flex gap-4">
                <span>
                  {game.homeTeam?.shortName || 'HOME'} {homeSpread > 0 ? '+' : ''}{homeSpread}
                  {homeSpreadOdds != null && ` (${homeSpreadOdds > 0 ? '+' : ''}${homeSpreadOdds})`}
                </span>
                <span>
                  {game.awayTeam?.shortName || 'AWAY'} {awaySpread > 0 ? '+' : ''}{awaySpread}
                  {awaySpreadOdds != null && ` (${awaySpreadOdds > 0 ? '+' : ''}${awaySpreadOdds})`}
                </span>
              </div>
            </div>
          )}
          
          {/* Moneyline */}
          {homeML != null && awayML != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Moneyline</span>
              <div className="flex gap-4">
                <span>
                  {game.homeTeam?.shortName || 'HOME'} {homeML > 0 ? '+' : ''}{homeML}
                </span>
                <span>
                  {game.awayTeam?.shortName || 'AWAY'} {awayML > 0 ? '+' : ''}{awayML}
                </span>
              </div>
            </div>
          )}
          
          {/* Total */}
          {total != null && overOdds != null && underOdds != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <div className="flex gap-4">
                <span>O {total} ({overOdds > 0 ? '+' : ''}{overOdds})</span>
                <span>U {total} ({underOdds > 0 ? '+' : ''}{underOdds})</span>
              </div>
            </div>
          )}
          
          {/* Display message if no odds available */}
          {homeSpread == null && homeML == null && total == null && (
            <div className="text-sm text-muted-foreground text-center py-2">
              No odds available
            </div>
          )}
        </div>
        
        {isDetecting && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              🔍 Monitoring for opportunities...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
