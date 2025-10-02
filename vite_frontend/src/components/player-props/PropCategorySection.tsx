import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PropCategory } from "@/types";
import { Game } from "@/types";
import { PlayerPropCard } from "./PlayerPropCard";
import { cn } from "@/lib/utils";

interface PropCategorySectionProps {
  category: PropCategory;
  game: Game;
  isExpanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function PropCategorySection({
  category,
  game,
  isExpanded,
  onToggle,
  compact = false,
}: PropCategorySectionProps) {
  return (
    <Card
      className={cn(
        "bg-background border border-border/20 shadow-none rounded-lg transition-all duration-200",
        "hover:shadow-sm",
        "mb-1",
      )}
    >
      <CardContent className="p-0">
        {/* Category Header */}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between h-9 px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-all duration-150",
            compact && "px-2 py-1 h-8",
          )}
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-semibold text-foreground",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {category.name}
            </span>
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({category.props.length})
            </span>
          </div>
          <span
            className={cn(
              "text-xs text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          >
            ▼
          </span>
        </Button>

        {/* Expanded Content */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-400 ease-out",
            isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className={cn("px-2 pb-2 space-y-2", compact && "px-1 pb-1")}>
            <div className="grid gap-2 grid-cols-1">
              {category.props.map((prop) => (
                <PlayerPropCard
                  key={prop.id}
                  prop={prop}
                  game={game}
                  compact={compact}
                  className="h-full"
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
