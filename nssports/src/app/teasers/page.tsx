"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useBetSlip } from "@/context";
import { TeaserMobileGameCard } from "@/components/features/teasers/TeaserMobileGameCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { Game } from "@/types";
import type { TeaserType } from "@/types/teaser";
import { getAvailableTeaserTypes, getTeaserConfig } from "@/types/teaser";

export default function TeasersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { betSlip, setBetType, setTeaserType } = useBetSlip();
  
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeaserType, setSelectedTeaserType] = useState<TeaserType | null>(null);
  
  // Fetch upcoming games (teasers are for upcoming games)
  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/games/upcoming');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const json = await response.json();
      const gamesData = Array.isArray(json.data) ? json.data : [];
      setGames(gamesData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch games';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);
  
  // Filter games to only show those eligible for teasers (spread and total bets available)
  const eligibleGames = useMemo(() => {
    return games.filter(game => {
      // Must have odds data
      if (!game.odds) return false;
      
      // Must have spread or total markets
      const hasSpread = game.odds.spread?.home?.line !== undefined && game.odds.spread?.away?.line !== undefined;
      const hasTotal = game.odds.total?.over?.line !== undefined || game.odds.total?.under?.line !== undefined;
      
      return hasSpread || hasTotal;
    });
  }, [games]);
  
  // Set teaser mode when page loads, reset to single when unmounting
  useEffect(() => {
    setBetType("teaser");
    
    // Cleanup: Reset to single bet mode when leaving teaser page
    return () => {
      setBetType("single");
    };
  }, [setBetType]);
  
  // When teaser type is selected, update context
  const handleTeaserTypeSelect = (type: TeaserType) => {
    setSelectedTeaserType(type);
    setTeaserType(type);
  };
  
  const availableTeasers = getAvailableTeaserTypes();
  
  if (!session) {
    return <LoadingScreen />;
  }
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Teaser type selection screen
  if (!selectedTeaserType) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-2xl font-bold">Teaser Bets</h1>
          </div>
          
          {/* Info Card */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">How Teasers Work</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Adjust point spreads and totals in your favor</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Combine 2 or more games for better lines at reduced odds</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>Only spreads and totals eligible (no moneylines or props)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>All legs must win for the teaser to pay</span>
              </li>
            </ul>
          </div>
          
          {/* Teaser Type Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Select Teaser Type
            </h3>
            
            <div className="grid gap-3">
              {availableTeasers.map((type) => {
                const config = getTeaserConfig(type);
                
                return (
                  <button
                    key={type}
                    onClick={() => handleTeaserTypeSelect(type)}
                    className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">
                          {config.displayName}
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {config.description}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded bg-blue-500/10 px-2 py-1 text-blue-400 font-medium">
                            NFL: {config.pointAdjustment}pts
                          </span>
                          {config.nbaPointAdjustment && (
                            <span className="rounded bg-blue-500/10 px-2 py-1 text-blue-400 font-medium">
                              NBA: {config.nbaPointAdjustment}pts
                            </span>
                          )}
                          <span className="rounded bg-accent/10 px-2 py-1 text-accent font-medium">
                            {config.minLegs === config.maxLegs 
                              ? `${config.minLegs} Teams` 
                              : `${config.minLegs}-${config.maxLegs} Teams`}
                          </span>
                          <span className="rounded bg-muted px-2 py-1 text-muted-foreground font-medium">
                            {config.pushRule === 'push' && 'Ties Push'}
                            {config.pushRule === 'lose' && 'Ties Lose'}
                            {config.pushRule === 'revert' && 'Reverts Down'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <div className={`text-xl font-bold ${config.odds > 0 ? 'text-green-400' : 'text-white'}`}>
                          {config.odds > 0 ? '+' : ''}{config.odds}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Games display with adjusted lines
  const teaserConfig = getTeaserConfig(selectedTeaserType);
  
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTeaserType(null)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{teaserConfig.displayName}</h1>
              <p className="text-sm text-muted-foreground">
                {teaserConfig.pointAdjustment} point adjustment • {teaserConfig.odds > 0 ? '+' : ''}{teaserConfig.odds} odds
              </p>
            </div>
          </div>
          
          {betSlip.bets.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2">
              <div className="text-xs text-blue-400 font-medium">
                {betSlip.bets.length} {betSlip.bets.length === 1 ? 'Leg' : 'Legs'} Selected
              </div>
            </div>
          )}
        </div>
        
        {/* Info Banner */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-400 font-medium mb-2">
            📊 Lines Adjusted In Your Favor
          </div>
          <div className="text-xs text-muted-foreground">
            All spreads and totals are adjusted by <strong className="text-foreground">{teaserConfig.pointAdjustment} points</strong> for {teaserConfig.eligibleLeagues.join(", ")}. 
            Select {teaserConfig.minLegs}+ games to build your teaser.
          </div>
        </div>
        
        {/* Games List */}
        {error ? (
          <div className="text-center py-12 text-destructive">
            {error}
          </div>
        ) : eligibleGames.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No games available for teasers at this time
          </div>
        ) : (
          <div className="space-y-4">
            {eligibleGames.map((game) => (
              <TeaserMobileGameCard
                key={game.id}
                game={game}
                teaserType={selectedTeaserType}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
