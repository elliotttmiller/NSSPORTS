"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import { useBetHistory } from "@/context";
import { useAccount } from "@/hooks/useAccount";

export default function AccountPage() {
  const { data: account, isLoading: accountLoading, error: accountError, refetch: refetchAccount } = useAccount();
  const { placedBets } = useBetHistory();
  
  // Real-time account data from API
  const balance = account?.balance ?? 0;
  const available = account?.available ?? 0;
  const risk = account?.risk ?? 0;
  const activeBetsCount = (placedBets || []).filter(b => b.status === 'pending').length;

  const [settings, setSettings] = useState({
    notifications: true,
    autoAcceptOddsChanges: false,
    defaultStake: 10,
  });

  // Show loading state
  if (accountLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading account...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (accountError) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-screen-2xl">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-destructive mb-2">Failed to load account data</p>
              <p className="text-sm text-muted-foreground mb-4">
                {accountError instanceof Error ? accountError.message : 'Please check your connection and try again.'}
              </p>
              <Button onClick={() => refetchAccount()} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-[1920px] pt-6">
        <div className="space-y-6 lg:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your profile and preferences
            </p>
          </div>
          <Button 
            onClick={() => refetchAccount()} 
            variant="outline" 
            size="sm"
            className="transition-all duration-150 w-full sm:w-auto"
          >
            Refresh Balance
          </Button>
        </div>

        {/* Summary Stats Grid - Desktop & Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-2 mb-8">
          {[ 
            { label: "Balance", value: formatCurrency(balance), color: "text-foreground" },
            { label: "Available", value: formatCurrency(available), color: "text-foreground" },
            { label: "Risk", value: formatCurrency(risk), color: "text-destructive" },
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
                  className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-12 md:min-h-14 p-2 md:p-3 flex flex-col items-center justify-center gap-0.5 hover:bg-accent/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                >
                  {content}
                </Link>
              );
            }
            return (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm min-h-12 md:min-h-14 p-2 md:p-3 flex flex-col items-center justify-center gap-0.5"
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
