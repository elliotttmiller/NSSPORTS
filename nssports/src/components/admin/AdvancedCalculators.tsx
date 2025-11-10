"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  TrendingUp, 
  Target,
  DollarSign,
  Percent,
  Info,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

/**
 * Advanced Calculators Component
 * Provides professional-grade betting calculators for operators
 */
export default function AdvancedCalculators() {
  // Kelly Criterion Calculator State
  const [kellyInputs, setKellyInputs] = useState({
    winProbability: 55,
    americanOdds: -110,
    bankroll: 10000,
    fractionalKelly: 1.0,
  });
  const [kellyResult, setKellyResult] = useState<any>(null);
  const [kellyLoading, setKellyLoading] = useState(false);

  // Devigging Calculator State
  const [devigInputs, setDevigInputs] = useState({
    odds1: -110,
    odds2: -110,
    method: 'multiplicative' as 'multiplicative' | 'additive' | 'power',
  });
  const [devigResult, setDevigResult] = useState<any>(null);
  const [devigLoading, setDevigLoading] = useState(false);

  // Market Efficiency Calculator State
  const [efficiencyInputs, setEfficiencyInputs] = useState({
    yourOdds: -115,
    marketConsensus: -110,
    sharpOdds: -108,
  });
  const [efficiencyResult, setEfficiencyResult] = useState<any>(null);
  const [efficiencyLoading, setEfficiencyLoading] = useState(false);

  // Break-Even Calculator State
  const [breakEvenOdds, setBreakEvenOdds] = useState(-110);
  const [breakEvenResult, setBreakEvenResult] = useState<any>(null);

  // Calculate Kelly Criterion
  const calculateKelly = async () => {
    setKellyLoading(true);
    try {
      const res = await fetch('/api/admin/odds-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'kelly_criterion',
          data: {
            ...kellyInputs,
            winProbability: kellyInputs.winProbability / 100,
          },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setKellyResult(result);
      } else {
        toast.error('Failed to calculate Kelly Criterion');
      }
    } catch (error) {
      toast.error('Error calculating Kelly Criterion');
    } finally {
      setKellyLoading(false);
    }
  };

  // Calculate Devigging
  const calculateDevig = async () => {
    setDevigLoading(true);
    try {
      const res = await fetch('/api/admin/odds-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'devig',
          data: devigInputs,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setDevigResult(result);
      } else {
        toast.error('Failed to calculate devig');
      }
    } catch (error) {
      toast.error('Error calculating devig');
    } finally {
      setDevigLoading(false);
    }
  };

  // Calculate Market Efficiency
  const calculateEfficiency = async () => {
    setEfficiencyLoading(true);
    try {
      const res = await fetch('/api/admin/odds-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'market_efficiency',
          data: efficiencyInputs,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setEfficiencyResult(result);
      } else {
        toast.error('Failed to calculate market efficiency');
      }
    } catch (error) {
      toast.error('Error calculating market efficiency');
    } finally {
      setEfficiencyLoading(false);
    }
  };

  // Calculate Break-Even
  const calculateBreakEven = async () => {
    try {
      const res = await fetch('/api/admin/odds-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'break_even',
          data: { americanOdds: breakEvenOdds },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setBreakEvenResult(result);
      } else {
        toast.error('Failed to calculate break-even');
      }
    } catch (error) {
      toast.error('Error calculating break-even');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Kelly Criterion Calculator */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Calculator className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h2 className="text-lg md:text-xl font-semibold">Kelly Criterion Calculator</h2>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          Calculate optimal bet sizing for maximum long-term growth. Industry standard for professional bankroll management.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <Label htmlFor="kelly-win-prob" className="text-sm md:text-base">Win Probability (%)</Label>
            <Input
              id="kelly-win-prob"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={kellyInputs.winProbability}
              onChange={(e) => setKellyInputs({ ...kellyInputs, winProbability: parseFloat(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="kelly-odds" className="text-sm md:text-base">American Odds</Label>
            <Input
              id="kelly-odds"
              type="number"
              value={kellyInputs.americanOdds}
              onChange={(e) => setKellyInputs({ ...kellyInputs, americanOdds: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="kelly-bankroll" className="text-sm md:text-base">Bankroll ($)</Label>
            <Input
              id="kelly-bankroll"
              type="number"
              step="100"
              min="0"
              value={kellyInputs.bankroll}
              onChange={(e) => setKellyInputs({ ...kellyInputs, bankroll: parseFloat(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="kelly-fraction" className="text-sm md:text-base">Fractional Kelly</Label>
            <Input
              id="kelly-fraction"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={kellyInputs.fractionalKelly}
              onChange={(e) => setKellyInputs({ ...kellyInputs, fractionalKelly: parseFloat(e.target.value) || 1 })}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">1.0 = Full Kelly, 0.5 = Half Kelly (recommended)</p>
          </div>
        </div>

        <Button onClick={calculateKelly} disabled={kellyLoading} className="w-full mb-4">
          {kellyLoading ? 'Calculating...' : 'Calculate Kelly Criterion'}
        </Button>

        {kellyResult && (
          <Card className="p-3 md:p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Optimal Bet Size</p>
                <p className="text-xl md:text-2xl font-bold text-accent">${kellyResult.optimalBetSize.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{kellyResult.optimalBetPercentage.toFixed(2)}% of bankroll</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Your Edge</p>
                <p className="text-xl md:text-2xl font-bold">{kellyResult.edge.toFixed(2)}%</p>
                <Badge className="mt-1" variant={kellyResult.isPositiveEV ? "default" : "destructive"}>
                  {kellyResult.isPositiveEV ? "Positive EV" : "Negative EV"}
                </Badge>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Expected Value</p>
                <p className="text-lg md:text-xl font-bold">{kellyResult.expectedValue.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Recommendation</p>
                <Badge 
                  variant={
                    kellyResult.recommendation === 'strong_bet' ? 'default' :
                    kellyResult.recommendation === 'moderate_bet' ? 'secondary' :
                    kellyResult.recommendation === 'small_bet' ? 'outline' : 'destructive'
                  }
                  className="capitalize"
                >
                  {kellyResult.recommendation.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </Card>
        )}
      </Card>

      {/* De-vigging Calculator */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Target className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h2 className="text-lg md:text-xl font-semibold">De-vigging Calculator</h2>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          Remove juice/vig to find true fair odds. Essential for pricing accuracy and market analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <Label htmlFor="devig-odds1" className="text-sm md:text-base">Odds 1 (American)</Label>
            <Input
              id="devig-odds1"
              type="number"
              value={devigInputs.odds1}
              onChange={(e) => setDevigInputs({ ...devigInputs, odds1: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="devig-odds2" className="text-sm md:text-base">Odds 2 (American)</Label>
            <Input
              id="devig-odds2"
              type="number"
              value={devigInputs.odds2}
              onChange={(e) => setDevigInputs({ ...devigInputs, odds2: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="devig-method" className="text-sm md:text-base">Method</Label>
            <select
              id="devig-method"
              value={devigInputs.method}
              onChange={(e) => setDevigInputs({ ...devigInputs, method: e.target.value as any })}
              className="mt-2 w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="multiplicative">Multiplicative (Industry Standard)</option>
              <option value="additive">Additive</option>
              <option value="power">Power</option>
            </select>
          </div>
        </div>

        <Button onClick={calculateDevig} disabled={devigLoading} className="w-full mb-4">
          {devigLoading ? 'Calculating...' : 'Calculate Fair Odds'}
        </Button>

        {devigResult && (
          <Card className="p-3 md:p-4 bg-muted/30">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Original Odds 1</p>
                  <p className="text-lg md:text-xl font-bold">{devigInputs.odds1 > 0 ? '+' : ''}{devigInputs.odds1}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Fair Odds 1</p>
                  <p className="text-lg md:text-xl font-bold text-accent">
                    {devigResult.fairOdds1 > 0 ? '+' : ''}{devigResult.fairOdds1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(devigResult.fairProbability1 * 100).toFixed(2)}% probability
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Original Odds 2</p>
                  <p className="text-lg md:text-xl font-bold">{devigInputs.odds2 > 0 ? '+' : ''}{devigInputs.odds2}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Fair Odds 2</p>
                  <p className="text-lg md:text-xl font-bold text-accent">
                    {devigResult.fairOdds2 > 0 ? '+' : ''}{devigResult.fairOdds2}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(devigResult.fairProbability2 * 100).toFixed(2)}% probability
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">House Vigorish</p>
                  <p className="text-xl md:text-2xl font-bold">{devigResult.vigorish.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Implied</p>
                  <p className="text-xl md:text-2xl font-bold">{(devigResult.totalImplied * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </Card>

      {/* Market Efficiency Analyzer */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h2 className="text-lg md:text-xl font-semibold">Market Efficiency Analyzer</h2>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          Compare your odds against market consensus and sharp books to ensure competitive pricing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <Label htmlFor="eff-your-odds" className="text-sm md:text-base">Your Odds</Label>
            <Input
              id="eff-your-odds"
              type="number"
              value={efficiencyInputs.yourOdds}
              onChange={(e) => setEfficiencyInputs({ ...efficiencyInputs, yourOdds: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="eff-market" className="text-sm md:text-base">Market Consensus</Label>
            <Input
              id="eff-market"
              type="number"
              value={efficiencyInputs.marketConsensus}
              onChange={(e) => setEfficiencyInputs({ ...efficiencyInputs, marketConsensus: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="eff-sharp" className="text-sm md:text-base">Sharp Odds (Optional)</Label>
            <Input
              id="eff-sharp"
              type="number"
              value={efficiencyInputs.sharpOdds}
              onChange={(e) => setEfficiencyInputs({ ...efficiencyInputs, sharpOdds: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
          </div>
        </div>

        <Button onClick={calculateEfficiency} disabled={efficiencyLoading} className="w-full mb-4">
          {efficiencyLoading ? 'Analyzing...' : 'Analyze Market Position'}
        </Button>

        {efficiencyResult && (
          <Card className="p-3 md:p-4 bg-muted/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Competitive Score</p>
                  <p className="text-2xl md:text-3xl font-bold">{efficiencyResult.competitiveScore}/100</p>
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Price Difference</p>
                  <p className="text-lg md:text-xl font-bold">
                    {efficiencyResult.priceDifference > 0 ? '+' : ''}{efficiencyResult.priceDifference}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-2">Recommendation</p>
                <Badge 
                  variant={
                    efficiencyResult.recommendation === 'well_priced' ? 'default' :
                    efficiencyResult.recommendation === 'more_competitive' ? 'secondary' :
                    efficiencyResult.recommendation === 'too_aggressive' ? 'destructive' : 'outline'
                  }
                  className="text-sm capitalize"
                >
                  {efficiencyResult.recommendation.replace(/_/g, ' ')}
                </Badge>
                {efficiencyResult.isAttractingSharpAction && (
                  <Badge variant="outline" className="ml-2 text-sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Attracting Sharp Action
                  </Badge>
                )}
              </div>
              {efficiencyResult.suggestedAdjustment && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="w-4 h-4 text-accent" />
                    <p>
                      Suggested adjustment: {efficiencyResult.suggestedAdjustment > 0 ? '+' : ''}
                      {efficiencyResult.suggestedAdjustment} points
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}
      </Card>

      {/* Break-Even Calculator */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Percent className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h2 className="text-lg md:text-xl font-semibold">Break-Even Calculator</h2>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          Calculate the win rate needed to break even at given odds.
        </p>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Label htmlFor="breakeven-odds" className="text-sm md:text-base">American Odds</Label>
            <Input
              id="breakeven-odds"
              type="number"
              value={breakEvenOdds}
              onChange={(e) => {
                setBreakEvenOdds(parseInt(e.target.value) || 0);
                setBreakEvenResult(null);
              }}
              className="mt-2"
            />
          </div>
          <Button onClick={calculateBreakEven} className="mt-7">
            Calculate
          </Button>
        </div>

        {breakEvenResult && (
          <Card className="p-3 md:p-4 bg-muted/30">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Break-Even Win Rate</p>
            <p className="text-3xl md:text-4xl font-bold text-accent">
              {breakEvenResult.breakEvenRate.toFixed(2)}%
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              You need to win at least {breakEvenResult.breakEvenRate.toFixed(2)}% of bets at {breakEvenOdds > 0 ? '+' : ''}
              {breakEvenOdds} to break even
            </p>
          </Card>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-3 md:p-4 bg-accent/5 border-accent/20">
        <div className="flex gap-2 md:gap-3">
          <Info className="w-4 h-4 md:w-5 md:h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-foreground">
            <p className="font-semibold mb-1">Professional Calculator Suite</p>
            <p>
              These calculators use industry-standard algorithms employed by major sportsbooks and professional
              bettors. Kelly Criterion optimizes bankroll growth, de-vigging reveals true odds, and market
              efficiency analysis ensures competitive pricing.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
