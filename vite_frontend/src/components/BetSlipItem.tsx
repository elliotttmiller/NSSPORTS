import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "@phosphor-icons/react";
import { formatOdds, formatTotalLine } from "@/lib/formatters";
import { formatBetDescription, formatMatchup } from "@/lib/betFormatters";
import { Bet } from "@/types";

interface BetSlipItemProps {
  bet: Bet;
  onRemove: () => void;
}

export function BetSlipItem({ bet, onRemove }: BetSlipItemProps) {
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="font-medium text-sm">
              {formatBetDescription(bet)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatMatchup(bet)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 ml-2"
          >
            <X size={14} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Odds:</span>
            <span>{formatOdds(bet.odds)}</span>
          </div>
          <div className="flex justify-between">
            <span>Stake:</span>
            <span>${bet.stake}</span>
          </div>
          <div className="flex justify-between font-medium text-foreground">
            <span>To Win:</span>
            <span>${bet.potentialPayout.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
