"use client";

import { TrendUp, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLiveGames } from "@/services/api";
import type { Game } from "@/types";
import { ProfessionalGameRow } from "@/components/features/games/ProfessionalGameRow";

export default function Home() {
  const activeBetsCount = 3;
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);

  useEffect(() => {
    getLiveGames().then((games) => setTrendingGames(games.slice(0, 5)));
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      {/* Main container with responsive padding */}
      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="text-center py-8 md:py-12">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
              Welcome, NorthStar User
            </h1>
            <div className="w-16 md:w-24 h-1 bg-accent mx-auto rounded-full"></div>
          </div>

          {/* Quick Stats - Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Balance", value: "$1,250.00" },
              { label: "Win Rate", value: "68%" },
              { label: "Active Bets", value: activeBetsCount },
              { label: "This Week", value: "+$340" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm min-h-[70px] md:min-h-[80px] p-4 flex flex-col items-center justify-center gap-1"
              >
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <p className="font-bold text-sm md:text-base text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Trending Games Section */}
          <div className="mt-12">
            <div className="flex items-center space-x-2 mb-4">
              <TrendUp size={20} className="text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Trending Live Games
              </h2>
            </div>
            
            <Card className="overflow-hidden">
              <div className="bg-card/50">
                {trendingGames.map((game, index) => (
                  <ProfessionalGameRow 
                    key={game.id} 
                    game={game}
                    isFirstInGroup={index === 0}
                  />
                ))}
              </div>
            </Card>
              
            <div className="flex justify-center mt-4">
              <Link
                href="/live"
                className="text-xs px-3 py-1 rounded bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-all duration-150 shadow-sm border border-border"
              >
                View All
              </Link>
            </div>
          </div>

          {/* View All Games Button */}
          <div className="text-center py-6">
            <Button asChild size="lg" className="px-8 py-3">
              <Link href="/games" className="flex items-center space-x-2">
                <Trophy size={20} />
                <span>View All Sports & Games</span>
              </Link>
            </Button>
          </div>

          {/* Bottom spacing for mobile */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

