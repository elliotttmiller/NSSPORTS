"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";

export default function AccountPage() {
  const [profile, setProfile] = useState({
    username: "NorthStar User",
    email: "user@nssportsclub.com",
    balance: 1250.0,
  });

  const [settings, setSettings] = useState({
    notifications: true,
    autoAcceptOddsChanges: false,
    defaultStake: 10,
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent">
              {formatCurrency(profile.balance)}
            </div>
            <div className="flex gap-2 mt-4">
              <Button>Deposit</Button>
              <Button variant="outline">Withdraw</Button>
            </div>
          </CardContent>
        </Card>


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
  );
}
