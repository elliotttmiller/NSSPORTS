import { Button } from "@/components/ui/button";

interface OddsButtonProps {
  team: string;
  odds: number;
  onClick: () => void;
  isSelected?: boolean;
}

export function OddsButton({
  team,
  odds,
  onClick,
  isSelected,
}: OddsButtonProps) {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      onClick={onClick}
      className="flex-1"
    >
      {team} {odds > 0 ? "+" : ""}
      {odds}
    </Button>
  );
}
