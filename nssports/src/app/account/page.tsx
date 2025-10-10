"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import { useBetHistory } from "@/context";

export default function AccountPage() {
  const [profile] = useState({
    username: 'JohnDoe123',
    email: 'john.doe@example.com',
    phoneNumber: '+1 (555) 123-4567',
    dateJoined: '2023-01-15',
    accountBalance: 1250.75,
    totalWagered: 15000.00,
    totalWon: 12500.00,
    winRate: 68.5
  });

  const [settings, setSettings] = useState({
    notifications: true,
    autoAcceptOddsChanges: false,
    defaultStake: 10,
  });

  const { placedBets } = useBetHistory();
  const activeBetsCount = (placedBets || []).filter(b => b.status === 'pending').length;

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
        <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Summary Stats Grid - Desktop & Mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 mb-8">
          {[ 
            { label: "Balance", value: formatCurrency(profile.accountBalance), color: "text-foreground" },
            { label: "Available", value: formatCurrency(profile.accountBalance), color: "text-foreground" },
            { label: "Risk", value: formatCurrency(0), color: "text-destructive" },
            { label: "Active Bets", value: activeBetsCount, color: "text-foreground" },
          ].map((stat) => {
            const content = (
              <>
                <p className="text-sm md:text-base text-foreground font-normal">{stat.label}</p>
                <p className={`font-semibold text-base ${stat.color}`}>{stat.value}</p>
              </>
            );
            if (stat.label === "Active Bets") {
              return (
                <Link
                  key={stat.label}
                  href="/my-bets"
                  aria-label="View my active bets"
                  className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-[48px] md:min-h-[56px] p-2 md:p-3 flex flex-col items-center justify-center gap-0.5 hover:bg-accent/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                >
                  {content}
                </Link>
              );
            }
            return (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-[48px] md:min-h-[56px] p-2 md:p-3 flex flex-col items-center justify-center gap-0.5"
              >
                {content}
              </div>
            );
          })}
        </div>

        {/* Betting Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Betting Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Receive updates on your bets and account
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifications: !settings.notifications,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications ? "bg-accent" : "bg-muted"
                }`}
                title="Toggle notifications"
                aria-label="Toggle notifications"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-Accept Odds Changes</div>
                <div className="text-sm text-muted-foreground">
                  Automatically accept minor odds changes
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    autoAcceptOddsChanges: !settings.autoAcceptOddsChanges,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoAcceptOddsChanges ? "bg-accent" : "bg-muted"
                }`}
                title="Toggle auto-accept odds changes"
                aria-label="Toggle auto-accept odds changes"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoAcceptOddsChanges ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium">Default Stake Amount</label>
              <Input
                type="number"
                value={settings.defaultStake}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultStake: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            </div>
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
