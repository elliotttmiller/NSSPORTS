import { Bet } from "@/types";

export const formatBetDescription = (bet: Bet) => {
  switch (bet.betType) {
    case "spread": {
      const team =
        bet.selection === "home" ? bet.game.homeTeam : bet.game.awayTeam;
      const line =
        bet.line !== undefined
          ? bet.line > 0
            ? `+${bet.line}`
            : bet.line
          : "";
      return `${team.shortName} ${line}`;
    }
    case "moneyline": {
      const team =
        bet.selection === "home" ? bet.game.homeTeam : bet.game.awayTeam;
      return `${team.shortName} ML`;
    }
    case "total": {
      const overUnder = bet.selection === "over" ? "Over" : "Under";
      return `${overUnder} ${bet.line || ""}`;
    }
    case "player_prop": {
      if (bet.playerProp) {
        const overUnder = bet.selection === "over" ? "Over" : "Under";
        return `${bet.playerProp.playerName} ${bet.playerProp.statType} ${overUnder} ${bet.line || ""}`;
      }
      return "Player Prop";
    }
    case "parlay": {
      if (bet.legs && Array.isArray(bet.legs)) {
        return `Parlay (${bet.legs.length} picks)`;
      }
      return "Parlay Bet";
    }
    default:
      return "Unknown Bet";
  }
};

export const formatMatchup = (bet: Bet) => {
  if (bet.betType === "parlay") {
    return "Multi-Game Parlay";
  }
  return `${bet.game.awayTeam.shortName} @ ${bet.game.homeTeam.shortName}`;
};

export const formatParlayLegs = (bet: Bet) => {
  if (bet.betType === "parlay" && bet.legs && Array.isArray(bet.legs)) {
    return bet.legs.map((leg) => ({
      description: formatBetDescription(leg),
      matchup: formatMatchup(leg),
    }));
  }
  return [];
};
