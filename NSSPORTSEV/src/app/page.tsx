"use client";

import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            NSSPORTSEV
          </h1>
          <p className="text-muted-foreground text-lg">
            Sports Betting Live Real-Time Odds Tracking and EV+/Arbitrage Calculator
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">Live Odds Tracking</h2>
            <p className="text-muted-foreground text-sm">
              Real-time odds updates from multiple sportsbooks with sub-second latency
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">EV+ Calculator</h2>
            <p className="text-muted-foreground text-sm">
              Calculate expected value to identify positive EV betting opportunities
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">Arbitrage Finder</h2>
            <p className="text-muted-foreground text-sm">
              Automatically detect arbitrage opportunities across different sportsbooks
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">Multi-Sport Support</h2>
            <p className="text-muted-foreground text-sm">
              Track odds for NFL, NBA, NHL, and more sports
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">Historical Analysis</h2>
            <p className="text-muted-foreground text-sm">
              View historical odds movements and line shopping trends
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 text-xl font-semibold">Alerts & Notifications</h2>
            <p className="text-muted-foreground text-sm">
              Get notified when profitable opportunities are detected
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-semibold">Coming Soon</h2>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>• Real-time odds streaming dashboard</li>
            <li>• EV+ calculation engine with customizable parameters</li>
            <li>• Arbitrage opportunity detection and alerts</li>
            <li>• Multi-sportsbook odds comparison</li>
            <li>• Historical odds data and analytics</li>
            <li>• Player props and game props tracking</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
