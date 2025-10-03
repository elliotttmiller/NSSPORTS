import { PlayerPropsContainer } from "@/components/player-props/PlayerPropsContainer";
import { PropCategory } from "@/types";
import { Game } from "@/types";

interface PlayerPropsSectionProps {
  categories: PropCategory[];
  game: Game;
  isLoading: boolean;
  compact?: boolean;
  expandedCategories?: Set<string>;
  setExpandedCategories?: (
    value: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
}

export function PlayerPropsSection({
  categories,
  game,
  isLoading,
  compact = false,
  expandedCategories,
  setExpandedCategories,
}: PlayerPropsSectionProps) {
  return (
    <PlayerPropsContainer
      categories={categories}
      game={game}
      isLoading={isLoading}
      compact={compact}
      expandedCategories={expandedCategories}
      setExpandedCategories={setExpandedCategories}
    />
  );
}
