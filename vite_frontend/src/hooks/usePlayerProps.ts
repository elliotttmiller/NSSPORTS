import { useMemo } from "react";
import type { PlayerProp, PropCategory } from "@/types";
import { useBetSlip } from "@/context/BetSlipContext";

/**
 * Hook to manage player prop interactions and state
 */
export function usePlayerProps(categories: PropCategory[]) {
  const { betSlip } = useBetSlip();

  // Calculate statistics for all props
  const stats = useMemo(() => {
    const totalProps = categories.reduce(
      (sum, category) => sum + category.props.length,
      0,
    );
    const mostPropsCategory = categories.reduce(
      (prev, current) =>
        prev.props.length > current.props.length ? prev : current,
      categories[0],
    );

    return {
      totalProps,
      totalCategories: categories.length,
      popularProps: mostPropsCategory?.props.length || 0,
      mostActiveCategory: mostPropsCategory?.name || "None",
    };
  }, [categories]);

  // Get selected props from bet slip
  const getSelectedProps = useMemo(() => {
    return betSlip.bets
      .filter((bet) => bet.betType === "player_prop")
      .map((bet) => ({
        playerId: bet.playerProp?.playerId,
        playerName: bet.playerProp?.playerName,
        statType: bet.playerProp?.statType,
        category: bet.playerProp?.category,
      }));
  }, [betSlip.bets]);

  // Check if a specific prop is selected
  const isPropSelected = (prop: PlayerProp) => {
    return betSlip.bets.some(
      (bet) =>
        bet.betType === "player_prop" &&
        bet.playerProp?.playerId === prop.playerId &&
        bet.playerProp?.statType === prop.statType,
    );
  };

  // Get count of selections for a player
  const getPlayerSelectionCount = (playerId: string) => {
    return betSlip.bets.filter(
      (bet) =>
        bet.betType === "player_prop" && bet.playerProp?.playerId === playerId,
    ).length;
  };

  // Sort categories by different criteria
  const sortCategories = (
    sortBy: "popular" | "alphabetical" | "count" = "popular",
  ): PropCategory[] => {
    switch (sortBy) {
      case "alphabetical":
        return [...categories].sort((a, b) => a.name.localeCompare(b.name));
      case "count":
        return [...categories].sort((a, b) => b.props.length - a.props.length);
      default:
        return [...categories].sort((a, b) => {
          if (a.key === "popular") return -1;
          if (b.key === "popular") return 1;
          return 0;
        });
    }
  };

  // Filter props by search term
  const filterProps = (searchTerm: string): PropCategory[] => {
    if (!searchTerm) return categories;

    return categories
      .map((category) => ({
        ...category,
        props: category.props.filter(
          (prop) =>
            prop.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prop.statType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prop.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prop.team.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      }))
      .filter((category) => category.props.length > 0);
  };

  return {
    stats,
    getSelectedProps,
    isPropSelected,
    getPlayerSelectionCount,
    sortCategories,
    filterProps,
  };
}
