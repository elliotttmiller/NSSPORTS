"use client";

import { useBetSlip } from "@/context";
import { Button, Card, CardContent, Input, Badge, Separator } from "@/components/ui";
import { X, Stack, Target } from "@phosphor-icons/react/dist/ssr";
import { formatOdds, formatCurrency } from "@/lib/formatters";

export function BetSlipPanel() {
  const { betSlip, removeBet, updateStake, setBetType, clearBetSlip } = useBetSlip();

  if (betSlip.bets.length === 0) {
    return (
      <div className="w-96 bg-card border-l border-border h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stack size={20} className="text-accent" />
            Bet Slip
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            3 selections • Parlay
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Target size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Click on odds to add bets to your slip
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-card border-l border-border h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stack size={20} className="text-accent" />
            Bet Slip
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBetSlip}
            className="h-8 px-2 text-xs"
          >
            Clear All
          </Button>
        </div>
        
        {/* Bet Type Tabs */}
        <div className="flex gap-2">
          <Button
            variant={betSlip.betType === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => setBetType("single")}
            className="flex-1"
          >
            Single Bets
          </Button>
          <Button
            variant={betSlip.betType === "parlay" ? "default" : "outline"}
            size="sm"
            onClick={() => setBetType("parlay")}
            className="flex-1"
          >
            Parlay ({betSlip.bets.length})
          </Button>
        </div>
        
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Parlay mode: all bets must win
          </div>
        )}
      </div>

      {/* Bets List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {betSlip.bets.map((bet) => (
          <Card key={bet.id} className="relative">
            <CardContent className="p-3">
              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeBet(bet.id)}
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X size={14} />
              </Button>

              {/* Bet Details */}
              <div className="pr-8">
                <div className="text-xs text-muted-foreground mb-1">
                  {bet.betType.toUpperCase()}
                </div>
                <div className="font-medium text-sm">
                  {bet.selection === "over" ? "Over" : bet.selection === "under" ? "Under" : 
                   bet.selection === "away" ? bet.game.awayTeam.shortName : bet.game.homeTeam.shortName}
                  {bet.line && ` ${bet.line > 0 ? "+" : ""}${bet.line}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bet.game.awayTeam.shortName} @ {bet.game.homeTeam.shortName}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">
                    {formatOdds(bet.odds)}
                  </Badge>
                </div>

                {/* Stake Input */}
                {betSlip.betType === "single" && (
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Stake
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <Input
                        type="number"
                        value={bet.stake}
                        onChange={(e) =>
                          updateStake(bet.id, parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-sm"
                        min="0"
                        max="10000"
                        step="1"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      To win: {formatCurrency(bet.potentialPayout - bet.stake)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Parlay Stake */}
        {betSlip.betType === "parlay" && betSlip.bets.length > 0 && (
          <Card className="bg-accent/5">
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Parlay (3 picks)</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">Total Stake ($)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <Input
                  type="number"
                  value={betSlip.bets[0]?.stake || 10}
                  onChange={(e) =>
                    updateStake(betSlip.bets[0].id, parseFloat(e.target.value) || 0)
                  }
                  className="h-9 text-sm"
                  min="0"
                  max="10000"
                  step="1"
                />
              </div>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parlay Odds:</span>
                  <span className="font-medium text-accent">
                    {formatOdds(betSlip.totalOdds)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Stake:</span>
            <span className="font-semibold">{formatCurrency(betSlip.totalStake)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Potential Payout:</span>
            <span className="font-semibold text-accent">
              {formatCurrency(betSlip.totalPayout)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Profit:</span>
            <span className="font-semibold text-accent">
              {formatCurrency(betSlip.totalPayout - betSlip.totalStake)}
            </span>
          </div>
        </div>

        <Button className="w-full" size="lg">
          Place {betSlip.betType === "parlay" ? "Parlay" : "Bets"}
        </Button>
      </div>
    </div>
  );
}
