"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeEV, type EVAnalysis } from "@/lib/calculators/ev-calculator";

/**
 * EV+ Calculator Component
 * 
 * Interactive calculator for analyzing expected value of betting opportunities
 * Includes Kelly Criterion recommendations and edge analysis
 */
export function EVCalculator() {
  const [trueProbability, setTrueProbability] = useState<string>("55");
  const [americanOdds, setAmericanOdds] = useState<string>("-110");
  const [stake, setStake] = useState<string>("100");
  const [bankroll, setBankroll] = useState<string>("1000");
  const [kellyFraction, setKellyFraction] = useState<string>("0.25");
  const [analysis, setAnalysis] = useState<EVAnalysis | null>(null);
  const [error, setError] = useState<string>("");

  const handleCalculate = () => {
    try {
      setError("");
      
      // Parse inputs
      const prob = parseFloat(trueProbability) / 100; // Convert percentage to decimal
      const odds = parseFloat(americanOdds);
      const stakeAmount = parseFloat(stake);
      const bankrollAmount = parseFloat(bankroll);
      const kellyFrac = parseFloat(kellyFraction);
      
      // Validate inputs
      if (isNaN(prob) || prob <= 0 || prob >= 1) {
        setError("Probability must be between 0 and 100");
        return;
      }
      
      if (isNaN(odds)) {
        setError("Invalid odds format");
        return;
      }
      
      if (isNaN(stakeAmount) || stakeAmount <= 0) {
        setError("Stake must be positive");
        return;
      }
      
      // Perform analysis
      const result = analyzeEV(
        prob,
        odds,
        stakeAmount,
        bankrollAmount > 0 ? bankrollAmount : undefined,
        kellyFrac
      );
      
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation error");
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">EV+ Calculator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculate expected value and optimal bet sizing using Kelly Criterion
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="probability">Your Win Probability (%)</Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={trueProbability}
            onChange={(e) => setTrueProbability(e.target.value)}
            placeholder="55"
          />
          <p className="text-xs text-muted-foreground">
            Your estimated probability of winning (0-100%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="odds">American Odds</Label>
          <Input
            id="odds"
            type="number"
            value={americanOdds}
            onChange={(e) => setAmericanOdds(e.target.value)}
            placeholder="-110"
          />
          <p className="text-xs text-muted-foreground">
            The odds offered (e.g., -110, +150)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stake">Bet Amount ($)</Label>
          <Input
            id="stake"
            type="number"
            min="0"
            step="1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankroll">Bankroll ($)</Label>
          <Input
            id="bankroll"
            type="number"
            min="0"
            step="1"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            placeholder="1000"
          />
          <p className="text-xs text-muted-foreground">
            For Kelly Criterion calculation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kelly">Kelly Fraction</Label>
          <Input
            id="kelly"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={kellyFraction}
            onChange={(e) => setKellyFraction(e.target.value)}
            placeholder="0.25"
          />
          <p className="text-xs text-muted-foreground">
            0.25 = 25% Kelly (recommended for risk management)
          </p>
        </div>
      </div>

      <Button onClick={handleCalculate} className="w-full">
        Calculate EV+
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

          {/* EV Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Expected Value</p>
              <p className={`text-2xl font-bold ${analysis.isPositiveEV ? 'text-green-500' : 'text-red-500'}`}>
                ${analysis.ev.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {analysis.evPercent.toFixed(2)}% EV
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Edge</p>
              <p className="text-2xl font-bold">
                {(analysis.edgePercent).toFixed(2)}%
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Implied Prob</p>
              <p className="text-2xl font-bold">
                {(analysis.impliedProbability * 100).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Confidence</p>
              <p className={`text-2xl font-bold capitalize ${
                analysis.confidence === 'high' ? 'text-green-500' :
                analysis.confidence === 'medium' ? 'text-yellow-500' :
                'text-gray-500'
              }`}>
                {analysis.confidence}
              </p>
            </div>
          </div>

          {/* Kelly Criterion Results */}
          {analysis.kelly && (
            <div className="p-4 bg-accent/50 rounded-lg space-y-2">
              <h4 className="font-semibold">Kelly Criterion Recommendation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recommended Bet</p>
                  <p className="text-xl font-bold text-green-500">
                    ${analysis.kelly.recommendedBet.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({(analysis.kelly.kellyFraction * analysis.kelly.fractionUsed * 100).toFixed(1)}% of bankroll)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Kelly</p>
                  <p className="text-xl font-bold">
                    ${analysis.kelly.fullKellyAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({(analysis.kelly.kellyFraction * 100).toFixed(1)}% of bankroll)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className={`p-4 rounded-lg ${
            analysis.recommendation === 'strong_bet' ? 'bg-green-500/20 border border-green-500/50' :
            analysis.recommendation === 'bet' ? 'bg-blue-500/20 border border-blue-500/50' :
            analysis.recommendation === 'pass' ? 'bg-yellow-500/20 border border-yellow-500/50' :
            'bg-red-500/20 border border-red-500/50'
          }`}>
            <p className="font-semibold">
              Recommendation: <span className="uppercase">{analysis.recommendation.replace('_', ' ')}</span>
            </p>
            <p className="text-sm mt-1">
              {analysis.recommendation === 'strong_bet' && 
                "Strong positive EV opportunity with high confidence. Consider betting."}
              {analysis.recommendation === 'bet' && 
                "Positive EV opportunity. Consider a smaller bet if confident in your probability estimate."}
              {analysis.recommendation === 'pass' && 
                "Marginal or no edge. Pass on this opportunity."}
              {analysis.recommendation === 'avoid' && 
                "Negative EV. Avoid this bet."}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
