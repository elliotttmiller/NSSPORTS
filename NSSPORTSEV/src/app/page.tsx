"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EVCalculator } from "@/components/features/calculators/EVCalculator";
import { ArbitrageCalculator } from "@/components/features/calculators/ArbitrageCalculator";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'ev' | 'arbitrage'>('ev');

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            NSSPORTSEV
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Sports Betting Analyzer, Calculator & Predictor
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time odds tracking with EV+ analysis and arbitrage detection
          </p>
          
          {/* Quick Navigation */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <Link href="/live-odds">
              <Button variant="default" size="sm" className="text-xs sm:text-sm">
                🔴 Live Odds Dashboard
              </Button>
            </Link>
          </div>
        </header>

        {/* Calculator Tabs */}
        <div className="space-y-4">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full sm:w-auto">
            <Button
              variant="ghost"
              className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'ev'
                  ? 'bg-background text-foreground shadow-sm'
                  : ''
              }`}
              onClick={() => setActiveTab('ev')}
            >
              EV+ Calculator
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'arbitrage'
                  ? 'bg-background text-foreground shadow-sm'
                  : ''
              }`}
              onClick={() => setActiveTab('arbitrage')}
            >
              Arbitrage Finder
            </Button>
          </div>
          
          <div className="mt-2">
            {activeTab === 'ev' && <EVCalculator />}
            {activeTab === 'arbitrage' && <ArbitrageCalculator />}
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ EV+ Calculator</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Calculate expected value with Kelly Criterion bet sizing recommendations
            </p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ Arbitrage Finder</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Detect guaranteed profit opportunities across multiple sportsbooks
            </p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ Live Odds Tracking</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Real-time odds updates with sub-second latency via WebSocket
            </p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ Multi-Sport Support</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Track odds for NFL, NBA, NHL, and more leagues
            </p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ Historical Analysis</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              View historical odds movements and CLV tracking
            </p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">✅ Smart Alerts</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Automated notifications for profitable opportunities
            </p>
          </Card>
        </div>

        {/* Algorithm Information */}
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-xl sm:text-2xl font-semibold">Industry-Standard Algorithms</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Expected Value (EV+)</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Formula: EV = (Probability Win × Profit Win) - (Probability Lose × Amount Lost)
              </p>
              <ul className="text-muted-foreground space-y-1 text-xs sm:text-sm mt-2 ml-4">
                <li>• Kelly Criterion for optimal bet sizing</li>
                <li>• Vig-free probability estimation</li>
                <li>• Closing Line Value (CLV) analysis</li>
                <li>• Confidence-based recommendations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Arbitrage Detection</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Formula: Arbitrage % = (1/Odds₁ + 1/Odds₂ + ... 1/Oddsₙ) × 100
              </p>
              <ul className="text-muted-foreground space-y-1 text-xs sm:text-sm mt-2 ml-4">
                <li>• Multi-sportsbook odds comparison</li>
                <li>• Optimal stake distribution calculation</li>
                <li>• Guaranteed profit calculation</li>
                <li>• Risk-free opportunity detection</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
