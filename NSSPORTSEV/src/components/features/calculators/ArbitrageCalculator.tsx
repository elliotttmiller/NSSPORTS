"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeArbitrage, type ArbitrageOpportunity, type ArbitrageOutcome } from "@/lib/calculators/arbitrage-calculator";

/**
 * Arbitrage Calculator Component
 * 
 * Interactive calculator for detecting and analyzing arbitrage opportunities
 * across multiple sportsbooks
 */
export function ArbitrageCalculator() {
  const [totalStake, setTotalStake] = useState<string>("1000");
  const [outcomes, setOutcomes] = useState<Array<{ outcome: string; sportsbook: string; odds: string }>>([
    { outcome: "Team A", sportsbook: "DraftKings", odds: "+150" },
    { outcome: "Team B", sportsbook: "FanDuel", odds: "-120" },
  ]);
  const [analysis, setAnalysis] = useState<ArbitrageOpportunity | null>(null);
  const [error, setError] = useState<string>("");

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { outcome: `Outcome ${outcomes.length + 1}`, sportsbook: "Sportsbook", odds: "+100" }]);
  };

  const handleRemoveOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const handleOutcomeChange = (index: number, field: keyof typeof outcomes[0], value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index][field] = value;
    setOutcomes(newOutcomes);
  };

  const handleCalculate = () => {
    try {
      setError("");
      
      // Parse inputs
      const stake = parseFloat(totalStake);
      
      if (isNaN(stake) || stake <= 0) {
        setError("Total stake must be positive");
        return;
      }

      // Parse outcomes
      const parsedOutcomes: ArbitrageOutcome[] = outcomes.map((o) => {
        const odds = parseFloat(o.odds);
        if (isNaN(odds)) {
          throw new Error(`Invalid odds for ${o.outcome}`);
        }
        return {
          outcome: o.outcome,
          sportsbook: o.sportsbook,
          americanOdds: odds,
        };
      });

      // Analyze arbitrage
      const result = analyzeArbitrage(parsedOutcomes, stake);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation error");
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Arbitrage Calculator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Detect guaranteed profit opportunities across multiple sportsbooks
        </p>
      </div>

      {/* Total Stake Input */}
      <div className="space-y-2">
        <Label htmlFor="totalStake">Total Stake ($)</Label>
        <Input
          id="totalStake"
          type="number"
          min="0"
          step="1"
          value={totalStake}
          onChange={(e) => setTotalStake(e.target.value)}
          placeholder="1000"
        />
        <p className="text-xs text-muted-foreground">
          Total amount to invest across all bets
        </p>
      </div>

      {/* Outcomes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Outcomes & Odds</Label>
          <Button onClick={handleAddOutcome} variant="outline" size="sm">
            + Add Outcome
          </Button>
        </div>

        {outcomes.map((outcome, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 space-y-1">
              <Label htmlFor={`outcome-${index}`} className="text-xs">Outcome</Label>
              <Input
                id={`outcome-${index}`}
                value={outcome.outcome}
                onChange={(e) => handleOutcomeChange(index, 'outcome', e.target.value)}
                placeholder="Team A"
              />
            </div>
            <div className="col-span-4 space-y-1">
              <Label htmlFor={`sportsbook-${index}`} className="text-xs">Sportsbook</Label>
              <Input
                id={`sportsbook-${index}`}
                value={outcome.sportsbook}
                onChange={(e) => handleOutcomeChange(index, 'sportsbook', e.target.value)}
                placeholder="DraftKings"
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label htmlFor={`odds-${index}`} className="text-xs">American Odds</Label>
              <Input
                id={`odds-${index}`}
                type="number"
                value={outcome.odds}
                onChange={(e) => handleOutcomeChange(index, 'odds', e.target.value)}
                placeholder="+150"
              />
            </div>
            <div className="col-span-2">
              {outcomes.length > 2 && (
                <Button
                  onClick={() => handleRemoveOutcome(index)}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleCalculate} className="w-full">
        Calculate Arbitrage
      </Button>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Results Section */}
      {analysis && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">Analysis Results</h3>

          {/* Arbitrage Detection */}
          <div className={`p-4 rounded-lg ${
            analysis.isArbitrage 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <p className="font-semibold text-lg">
              {analysis.isArbitrage ? '✅ Arbitrage Opportunity Detected!' : '❌ No Arbitrage Opportunity'}
            </p>
            <p className="text-sm mt-1">
              Arbitrage Percentage: {analysis.arbitragePercent.toFixed(2)}%
              {analysis.isArbitrage && ' (< 100% = Guaranteed Profit!)'}
            </p>
          </div>

          {/* Profit Summary */}
          {analysis.isArbitrage && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Guaranteed Profit</p>
                <p className="text-3xl font-bold text-green-500">
                  ${analysis.profit.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profit %</p>
                <p className="text-3xl font-bold text-green-500">
                  {analysis.profitPercent.toFixed(2)}%
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quality</p>
                <p className={`text-2xl font-bold capitalize ${
                  analysis.quality === 'excellent' ? 'text-green-500' :
                  analysis.quality === 'good' ? 'text-blue-500' :
                  analysis.quality === 'fair' ? 'text-yellow-500' :
                  'text-gray-500'
                }`}>
                  {analysis.quality}
                </p>
              </div>
            </div>
          )}

          {/* Stake Distribution */}
          <div className="space-y-2">
            <h4 className="font-semibold">Recommended Stakes</h4>
            <div className="space-y-2">
              {analysis.stakes.map((stake, index) => (
                <div key={index} className="p-3 bg-accent/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{stake.outcome}</p>
                      <p className="text-sm text-muted-foreground">{stake.sportsbook}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${stake.stake.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {stake.stakePercent.toFixed(1)}% of total
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Payout: ${stake.potentialPayout.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg space-y-2">
              <p className="font-semibold">⚠️ Warnings</p>
              <ul className="list-disc list-inside space-y-1">
                {analysis.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {analysis.isArbitrage && (
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="font-semibold mb-2">How to Execute:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Place each bet at the specified sportsbook immediately</li>
                <li>Use the exact stake amounts shown above</li>
                <li>Verify odds haven&apos;t changed before placing bets</li>
                <li>Regardless of outcome, you&apos;ll profit ${analysis.profit.toFixed(2)}</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
