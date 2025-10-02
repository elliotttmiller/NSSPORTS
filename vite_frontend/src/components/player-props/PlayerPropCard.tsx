import { useCallback } from "react";
import { useBetSlip } from "@/context/BetSlipContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerProp } from "@/types";
import { Game } from "@/types";
import { formatOdds, formatTotalLine } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlayerPropCardProps {
  prop: PlayerProp;
  game: Game;
  compact?: boolean;
  className?: string;
}

export function PlayerPropCard({
  prop,
  game,
  compact = false,
  className,
}: PlayerPropCardProps) {
  const { addBet, betSlip } = useBetSlip();

  // Check if this prop is already in bet slip
  const isOverSelected = betSlip.bets.some(
    (bet) =>
      bet.betType === "player_prop" &&
      bet.playerProp?.playerId === prop.playerId &&
      bet.selection === "over",
  );
  const isUnderSelected = betSlip.bets.some(
    (bet) =>
      bet.betType === "player_prop" &&
      bet.playerProp?.playerId === prop.playerId &&
      bet.selection === "under",
  );

  const handlePlayerPropClick = useCallback(
    (e: React.MouseEvent, selection: "over" | "under") => {
      e.stopPropagation();
      const odds = selection === "over" ? prop.overOdds : prop.underOdds;
      addBet(game, "player_prop", selection, odds, prop.line, prop);
      if ("vibrate" in navigator) {
        navigator.vibrate([10, 5, 15]);
      }
      toast.success(
        `${prop.playerName} ${prop.statType} ${selection.toUpperCase()} ${formatTotalLine(prop.line)} added`,
        {
          duration: 2000,
          position: "bottom-center",
          style: {
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-fg)",
          },
        },
      );
    },
    [addBet, game, prop],
  );

  return (
    <Card
      className={cn(
        "group/card bg-background border-border/30 transition-all duration-200",
        "hover:bg-muted/40 hover:border-accent/10 hover:shadow-sm",
        "rounded-lg",
        className,
      )}
    >
      <CardContent className={cn("p-0", compact ? "p-2" : "p-3")}>
        {/* Player Header */}
        <div
          className={cn(
            "flex items-center justify-between mb-2",
            compact && "mb-1",
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h5
                className={cn(
                  "font-semibold text-foreground truncate",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {prop.playerName}
              </h5>
              <span className="text-xs text-muted-foreground font-normal tracking-wide">
                {prop.position}
              </span>
            </div>
            <span
              className={cn(
                "text-muted-foreground font-normal",
                compact ? "text-xs" : "text-xs",
              )}
            >
              {prop.statType}
            </span>
          </div>
        </div>
        {/* Betting Grid */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isOverSelected ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-2 text-xs font-medium rounded-md",
              "transition-all duration-150",
              isOverSelected
                ? "bg-accent/90 text-white"
                : "bg-background text-foreground border-border/40",
              "hover:bg-accent/10 hover:border-accent/30",
            )}
            onClick={(e) => handlePlayerPropClick(e, "over")}
          >
            <span>
              O {formatTotalLine(prop.line)}{" "}
              <span className="ml-1 font-normal">
                {formatOdds(prop.overOdds)}
              </span>
            </span>
          </Button>
          <Button
            variant={isUnderSelected ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-2 text-xs font-medium rounded-md",
              "transition-all duration-150",
              isUnderSelected
                ? "bg-accent/90 text-white"
                : "bg-background text-foreground border-border/40",
              "hover:bg-accent/10 hover:border-accent/30",
            )}
            onClick={(e) => handlePlayerPropClick(e, "under")}
          >
            <span>
              U {formatTotalLine(prop.line)}{" "}
              <span className="ml-1 font-normal">
                {formatOdds(prop.underOdds)}
              </span>
            </span>
          </Button>
        </div>
        {/* Selection Indicator */}
        {(isOverSelected || isUnderSelected) && (
          <div className="mt-2 pt-2 border-t border-border/20">
            <div className="flex items-center justify-center">
              <span className="bg-accent/10 text-accent border-accent/20 text-xs font-medium rounded px-2 py-0.5">
                Added to Bet Slip
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
