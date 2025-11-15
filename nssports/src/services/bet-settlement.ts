/**
 * Bet Settlement Service
 * 
 * Core logic for determining bet outcomes and settling bets when games finish.
 * Handles all bet types: single, parlay, teaser, if-bets, reverse bets, round robins.
 * 
 * Architecture:
 * 1. Monitors finished games
 * 2. Grades each bet leg based on final scores and lines
 * 3. Determines overall bet outcome (won/lost/push)
 * 4. Updates bet status and player balances
 * 5. Moves bets to history
 */

import { prisma } from "@/lib/prisma";
import { fetchPlayerStats } from "@/lib/player-stats";
import { getPeriodScore } from "@/lib/period-scores";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BetGradingResult {
  status: "won" | "lost" | "push";
  reason?: string;
}

export interface LegGradingResult {
  legId: string;
  status: "won" | "lost" | "push";
  reason: string;
}

export interface SettlementResult {
  betId: string;
  status: "won" | "lost" | "push";
  payout: number;
  legs?: LegGradingResult[];
}

// ============================================================================
// GRADING FUNCTIONS - SINGLE BET TYPES
// ============================================================================

/**
 * Grade a spread bet
 * 
 * Rules:
 * - Home covers if: (homeScore + line) > awayScore
 * - Away covers if: (awayScore - line) > homeScore
 * - Push if: exactly equal
 */
export function gradeSpreadBet(params: {
  selection: string; // 'home' or 'away'
  line: number;
  homeScore: number;
  awayScore: number;
}): BetGradingResult {
  const { selection, line, homeScore, awayScore } = params;

  if (selection === "home") {
    const adjustedHomeScore = homeScore + line;
    if (adjustedHomeScore > awayScore) {
      return { status: "won", reason: `Home covered ${line > 0 ? '+' : ''}${line}` };
    } else if (adjustedHomeScore < awayScore) {
      return { status: "lost", reason: `Home failed to cover ${line > 0 ? '+' : ''}${line}` };
    } else {
      return { status: "push", reason: "Exact push" };
    }
  } else {
    // Away team - line is reversed
    const adjustedAwayScore = awayScore - line;
    if (adjustedAwayScore > homeScore) {
      return { status: "won", reason: `Away covered ${line < 0 ? '' : '+'}${-line}` };
    } else if (adjustedAwayScore < homeScore) {
      return { status: "lost", reason: `Away failed to cover ${line < 0 ? '' : '+'}${-line}` };
    } else {
      return { status: "push", reason: "Exact push" };
    }
  }
}

/**
 * Grade a moneyline bet
 * 
 * Rules:
 * - Win if your team has more points
 * - Push if tie (rare, but possible in some sports)
 * - No half points in moneyline
 */
export function gradeMoneylineBet(params: {
  selection: string; // 'home' or 'away'
  homeScore: number;
  awayScore: number;
}): BetGradingResult {
  const { selection, homeScore, awayScore } = params;

  if (homeScore === awayScore) {
    return { status: "push", reason: "Game tied" };
  }

  if (selection === "home") {
    return homeScore > awayScore
      ? { status: "won", reason: `Home won ${homeScore}-${awayScore}` }
      : { status: "lost", reason: `Home lost ${homeScore}-${awayScore}` };
  } else {
    return awayScore > homeScore
      ? { status: "won", reason: `Away won ${awayScore}-${homeScore}` }
      : { status: "lost", reason: `Away lost ${awayScore}-${homeScore}` };
  }
}

/**
 * Grade a total (over/under) bet
 * 
 * Rules:
 * - Over wins if: totalScore > line
 * - Under wins if: totalScore < line
 * - Push if: totalScore === line
 */
export function gradeTotalBet(params: {
  selection: string; // 'over' or 'under'
  line: number;
  homeScore: number;
  awayScore: number;
}): BetGradingResult {
  const { selection, line, homeScore, awayScore } = params;
  const totalScore = homeScore + awayScore;

  // Only push if line is a whole number and total matches exactly
  // Decimal lines (220.5, 48.5) cannot push since scores are integers
  const isWholeNumberLine = Number.isInteger(line);
  if (isWholeNumberLine && totalScore === line) {
    return { status: "push", reason: `Total exactly ${line}` };
  }

  if (selection === "over") {
    return totalScore > line
      ? { status: "won", reason: `Total ${totalScore} over ${line}` }
      : { status: "lost", reason: `Total ${totalScore} under ${line}` };
  } else {
    return totalScore < line
      ? { status: "won", reason: `Total ${totalScore} under ${line}` }
      : { status: "lost", reason: `Total ${totalScore} over ${line}` };
  }
}

/**
 * Grade a player prop bet
 * 
 * Requires actual player stats from the game.
 * For now, this is a placeholder - in production you'd fetch real stats.
 * 
 * @param params - Player prop bet details
 * @param playerStats - Actual player performance data
 */
export function gradePlayerPropBet(params: {
  selection: string; // 'over' or 'under'
  line: number;
  playerId: string;
  statType: string; // 'points', 'rebounds', 'assists', etc.
}, playerStats?: { [statType: string]: number }): BetGradingResult {
  const { selection, line, statType } = params;

  // TODO: Integrate with actual player stats API
  // If stats unavailable, we cannot grade the bet - throw error to prevent settlement
  if (!playerStats || playerStats[statType] === undefined) {
    console.error(`[gradePlayerPropBet] No stats available for ${statType}, cannot grade bet`);
    throw new Error(`Player stats unavailable for ${statType}`);
  }

  const actualValue = playerStats[statType];

  // Only push if line is a whole number and stat matches exactly
  // Decimal lines (9.5, 24.5) CANNOT push since stats are integers
  const isWholeNumberLine = Number.isInteger(line);
  if (isWholeNumberLine && actualValue === line) {
    return { status: "push", reason: `Exactly ${line} ${statType}` };
  }

  if (selection === "over") {
    return actualValue > line
      ? { status: "won", reason: `${actualValue} ${statType} over ${line}` }
      : { status: "lost", reason: `${actualValue} ${statType} under ${line}` };
  } else {
    return actualValue < line
      ? { status: "won", reason: `${actualValue} ${statType} under ${line}` }
      : { status: "lost", reason: `${actualValue} ${statType} over ${line}` };
  }
}

/**
 * Grade a game prop bet
 * 
 * Handles team totals, quarter/period props, etc.
 */
export function gradeGamePropBet(params: {
  propType: string;
  selection: string;
  line?: number;
  homeScore: number;
  awayScore: number;
}, periodScores?: { home: number; away: number } | null): BetGradingResult {
  const { propType, selection, line, homeScore: _homeScore, awayScore: _awayScore } = params;

  // Team total props (e.g., "Home team over 110.5 points")
  // First check if this is a PERIOD-SPECIFIC team total (1q_team_total_home_over)
  if (/^(1q|2q|3q|4q|1h|2h|1p|2p|3p)_team_total/.test(propType)) {
    // Period-specific team total
    if (!periodScores) {
      console.warn(`[gradeGamePropBet] No period data available for ${propType}, marking as push`);
      return { status: "push", reason: "Period data unavailable" };
    }

    if (!line) {
      return { status: "push", reason: "No line available" };
    }

    const isHomeTeam = selection.includes("home");
    const isOver = selection.includes("over");
    const teamScore = isHomeTeam ? periodScores.home : periodScores.away;

    // Only push if line is a whole number and score matches exactly
    // Decimal lines (48.5, 110.5) cannot push since scores are integers
    const isWholeNumberLine = Number.isInteger(line);
    if (isWholeNumberLine && teamScore === line) {
      return { status: "push", reason: `Period team total exactly ${line}` };
    }

    if (isOver) {
      return teamScore > line
        ? { status: "won", reason: `Period: ${teamScore}, over ${line}` }
        : { status: "lost", reason: `Period: ${teamScore}, under ${line}` };
    } else {
      return teamScore < line
        ? { status: "won", reason: `Period: ${teamScore}, under ${line}` }
        : { status: "lost", reason: `Period: ${teamScore}, over ${line}` };
    }
  }
  
  // Regular FULL GAME team total (team_total_home_over)
  if (propType.includes("team_total")) {
    if (!line) {
      return { status: "push", reason: "No line available" };
    }

    const isHomeTeam = selection.includes("home");
    const teamScore = isHomeTeam ? _homeScore : _awayScore;
    const isOver = selection.includes("over");

    // Only push if line is a whole number and score matches exactly
    // Decimal lines (110.5, 48.5) cannot push since scores are integers
    const isWholeNumberLine = Number.isInteger(line);
    if (isWholeNumberLine && teamScore === line) {
      return { status: "push", reason: `Team total exactly ${line}` };
    }

    if (isOver) {
      return teamScore > line
        ? { status: "won", reason: `Team scored ${teamScore}, over ${line}` }
        : { status: "lost", reason: `Team scored ${teamScore}, under ${line}` };
    } else {
      return teamScore < line
        ? { status: "won", reason: `Team scored ${teamScore}, under ${line}` }
        : { status: "lost", reason: `Team scored ${teamScore}, over ${line}` };
    }
  }

  // Default: unable to grade
  console.warn(`[gradeGamePropBet] Unknown prop type: ${propType}, marking as push`);
  return { status: "push", reason: "Unknown prop type" };
}

// ============================================================================
// PARLAY GRADING
// ============================================================================

/**
 * Grade a parlay bet
 * 
 * Rules:
 * - ALL legs must win for parlay to win
 * - If ANY leg loses, entire parlay loses
 * - If ANY leg pushes (and no losses), parlay odds are recalculated without that leg
 * - If ALL legs push, entire parlay pushes
 */
export function gradeParlayBet(
  legResults: LegGradingResult[]
): BetGradingResult {
  const hasLoss = legResults.some(leg => leg.status === "lost");
  const hasPush = legResults.some(leg => leg.status === "push");
  const allWin = legResults.every(leg => leg.status === "won");
  const allPush = legResults.every(leg => leg.status === "push");

  if (hasLoss) {
    return {
      status: "lost",
      reason: `Parlay lost - ${legResults.filter(l => l.status === "lost").length} leg(s) lost`
    };
  }

  if (allPush) {
    return {
      status: "push",
      reason: "All legs pushed"
    };
  }

  if (allWin) {
    return {
      status: "won",
      reason: `Parlay won - all ${legResults.length} legs won`
    };
  }

  if (hasPush) {
    const winningLegs = legResults.filter(leg => leg.status === "won");
    return {
      status: "won",
      reason: `Parlay won with ${winningLegs.length} legs (${legResults.length - winningLegs.length} pushed)`
    };
  }

  // Shouldn't reach here, but default to push for safety
  return { status: "push", reason: "Unable to determine outcome" };
}

// ============================================================================
// TEASER GRADING
// ============================================================================

/**
 * Grade a teaser bet with push rules
 * 
 * Rules vary based on push rule:
 * - "push": Any push makes entire teaser push
 * - "lose": Any push makes entire teaser lose
 * - "revert": Push drops teaser to lower tier (6T->5T->4T->3T->2T)
 */
export function gradeTeaserBet(
  legResults: LegGradingResult[],
  pushRule: "push" | "lose" | "revert",
  originalStake: number,
  _teaserType: string
): { status: "won" | "lost" | "push"; payout: number; reason: string } {
  const hasLoss = legResults.some(leg => leg.status === "lost");
  const hasPush = legResults.some(leg => leg.status === "push");
  const allWin = legResults.every(leg => leg.status === "won");

  // Any loss = entire teaser loses
  if (hasLoss) {
    return {
      status: "lost",
      payout: 0,
      reason: `Teaser lost - ${legResults.filter(l => l.status === "lost").length} leg(s) lost`
    };
  }

  // All wins = teaser wins
  if (allWin) {
    // Payout calculation would need teaser odds config
    // For now, return original payout - this would be calculated upstream
    return {
      status: "won",
      payout: 0, // Caller should calculate based on teaser odds
      reason: `Teaser won - all ${legResults.length} legs won`
    };
  }

  // Handle pushes based on rule
  if (hasPush) {
    switch (pushRule) {
      case "push":
        return {
          status: "push",
          payout: originalStake,
          reason: "Teaser pushed - returning stake"
        };
      
      case "lose":
        return {
          status: "lost",
          payout: 0,
          reason: "Teaser lost due to push (lose rule)"
        };
      
      case "revert":
        const winningLegs = legResults.filter(l => l.status === "won").length;
        // Payout calculation for reverted teaser would happen upstream
        return {
          status: "won",
          payout: 0, // Caller calculates reverted payout
          reason: `Teaser reverted to ${winningLegs} legs`
        };
    }
  }

  return { status: "push", payout: originalStake, reason: "Unable to determine outcome" };
}

// ============================================================================
// BET SETTLEMENT WORKFLOW
// ============================================================================

/**
 * Settle a single bet by ID
 * 
 * Main entry point for settling any bet type.
 * Determines outcome and updates database.
 */
export async function settleBet(betId: string): Promise<SettlementResult | null> {
  try {
    // Fetch bet with all related data
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        game: true,
        user: {
          include: {
            account: true
          }
        }
      }
    });

    if (!bet) {
      console.error(`[settleBet] Bet ${betId} not found`);
      return null;
    }

    if (bet.status !== "pending") {
      console.log(`[settleBet] Bet ${betId} already settled with status: ${bet.status}`);
      return null;
    }

    // Multi-leg bets (parlays, teasers, etc.) don't have a single gameId
    const isMultiLegBet = ["parlay", "teaser", "if_bet", "reverse", "bet_it_all", "round_robin"].includes(bet.betType);

    if (!isMultiLegBet) {
      if (!bet.game) {
        console.error(`[settleBet] Bet ${betId} has no associated game`);
        return null;
      }

      if (bet.game.status !== "finished") {
        console.log(`[settleBet] Game ${bet.game.id} not finished yet (status: ${bet.game.status})`);
        return null;
      }

      if (bet.game.homeScore === null || bet.game.awayScore === null) {
        console.error(`[settleBet] Game ${bet.game.id} missing final scores`);
        return null;
      }
    }

    // Grade bet based on type
    let result: BetGradingResult;
    let legResults: LegGradingResult[] | undefined;
    let payout = 0; // Initialize payout variable here

    switch (bet.betType) {
      case "spread":
        if (bet.line === null) {
          console.error(`[settleBet] Spread bet ${betId} missing line`);
          return null;
        }
        result = gradeSpreadBet({
          selection: bet.selection,
          line: bet.line,
          homeScore: bet.game!.homeScore!,
          awayScore: bet.game!.awayScore!
        });
        break;

      case "moneyline":
        result = gradeMoneylineBet({
          selection: bet.selection,
          homeScore: bet.game!.homeScore!,
          awayScore: bet.game!.awayScore!
        });
        break;

      case "total":
        if (bet.line === null) {
          console.error(`[settleBet] Total bet ${betId} missing line`);
          return null;
        }
        result = gradeTotalBet({
          selection: bet.selection,
          line: bet.line,
          homeScore: bet.game!.homeScore!,
          awayScore: bet.game!.awayScore!
        });
        break;

      case "player_prop":
        // Extract player prop metadata from bet.legs JSON
        let playerPropMetadata: { playerId?: string; statType?: string } | undefined;
        try {
          if (bet.legs) {
            const metadata = typeof bet.legs === 'string' ? JSON.parse(bet.legs) : bet.legs;
            playerPropMetadata = metadata.playerProp;
          }
        } catch (e) {
          console.error(`[settleBet] Failed to parse player prop metadata for bet ${betId}:`, e);
        }

        if (!playerPropMetadata?.playerId || !playerPropMetadata?.statType) {
          console.error(`[settleBet] Player prop bet ${betId} missing required metadata (playerId/statType)`);
          return null;
        }

        if (!bet.gameId) {
          console.error(`[settleBet] Player prop bet ${betId} missing gameId`);
          return null;
        }

        // ✅ Fetch actual player stats from SDK
        console.log(`[settleBet] Fetching player stats for ${playerPropMetadata.playerId} in game ${bet.gameId}`);
        const playerStats = await fetchPlayerStats(bet.gameId, playerPropMetadata.playerId);
        
        if (!playerStats) {
          console.warn(`[settleBet] Player stats unavailable for player ${playerPropMetadata.playerId} - cannot settle yet`);
          return null; // Don't settle until stats are available
        }
        
        try {
          result = gradePlayerPropBet({
            selection: bet.selection,
            line: bet.line || 0,
            playerId: playerPropMetadata.playerId,
            statType: playerPropMetadata.statType
          }, playerStats);
        } catch (error) {
          console.error(`[settleBet] Failed to grade player prop bet ${betId}:`, error);
          return null; // Can't settle without stats
        }
        break;

      case "game_prop":
        // Extract game prop metadata from bet.legs JSON
        let gamePropMetadata: { propType?: string; periodID?: string } | undefined;
        try {
          if (bet.legs) {
            const metadata = typeof bet.legs === 'string' ? JSON.parse(bet.legs) : bet.legs;
            gamePropMetadata = metadata.gameProp;
          }
        } catch (e) {
          console.error(`[settleBet] Failed to parse game prop metadata for bet ${betId}:`, e);
        }

        if (!gamePropMetadata?.propType) {
          console.error(`[settleBet] Game prop bet ${betId} missing propType in metadata`);
          return null;
        }

        // Check if this is a period/quarter prop
        let periodScoresForProp: { home: number; away: number } | null = null;
        if (gamePropMetadata.periodID && bet.gameId) {
          console.log(`[settleBet] Fetching period ${gamePropMetadata.periodID} scores for game ${bet.gameId}`);
          periodScoresForProp = await getPeriodScore(bet.gameId, gamePropMetadata.periodID);
          
          if (!periodScoresForProp) {
            console.warn(`[settleBet] Period ${gamePropMetadata.periodID} scores unavailable - marking as push`);
          }
        }

        result = gradeGamePropBet({
          propType: gamePropMetadata.propType,
          selection: bet.selection,
          line: bet.line ?? undefined,
          homeScore: bet.game!.homeScore!,
          awayScore: bet.game!.awayScore!
        }, periodScoresForProp);
        break;

      case "parlay":
        // Grade each leg, then determine parlay outcome
        try {
          legResults = await gradeParlayLegs(bet);
          result = gradeParlayBet(legResults);
        } catch (error) {
          // If any leg cannot be graded (missing stats), skip settlement for now
          console.warn(`[settleBet] Cannot settle parlay yet - missing data:`, error);
          return null;
        }
        break;

      case "teaser":
        // Grade each leg with adjusted lines
        try {
          legResults = await gradeTeaserLegs(bet);
          const pushRule = (bet.teaserMetadata as { pushRule?: string } | null)?.pushRule || "push";
          const teaserResult = gradeTeaserBet(
            legResults,
            pushRule as "push" | "lose" | "revert",
            bet.stake,
            bet.teaserType || ""
          );
          result = {
            status: teaserResult.status,
            reason: teaserResult.reason
          };
        } catch (error) {
          // If any leg cannot be graded (missing stats), skip settlement for now
          console.warn(`[settleBet] Cannot settle teaser yet - missing data:`, error);
          return null;
        }
        break;

      case "if_bet":
        const ifBetResult = await settleIfBet(bet);
        if (!ifBetResult) return null;
        result = {
          status: ifBetResult.status,
          reason: "If bet settled"
        };
        payout = ifBetResult.payout;
        break;

      case "reverse":
        const reverseResult = await settleReverseBet(bet);
        if (!reverseResult) return null;
        result = {
          status: reverseResult.status,
          reason: "Reverse bet settled"
        };
        payout = reverseResult.payout;
        break;

      case "bet_it_all":
        const betItAllResult = await settleBetItAll(bet);
        if (!betItAllResult) return null;
        result = {
          status: betItAllResult.status,
          reason: "Bet it all settled"
        };
        payout = betItAllResult.payout;
        break;

      case "round_robin":
        const roundRobinResult = await settleRoundRobin(bet);
        if (!roundRobinResult) return null;
        result = {
          status: roundRobinResult.status,
          reason: "Round robin settled"
        };
        payout = roundRobinResult.payout;
        break;

      default:
        console.error(`[settleBet] Unsupported bet type: ${bet.betType}`);
        return null;
    }

    // Calculate payout (if not already set by advanced bet types)
    if (!payout) {
      if (result.status === "won") {
        payout = bet.potentialPayout;
      } else if (result.status === "push") {
        payout = bet.stake;
      }
      // lost = 0 payout (already initialized to 0)
    }

    // Update bet and account in transaction
    await prisma.$transaction([
      // Update bet status
      prisma.bet.update({
        where: { id: betId },
        data: {
          status: result.status,
          settledAt: new Date()
        }
      }),
      // Update account balance
      // Note: Stake was already deducted when bet was placed
      // - For wins: add the full payout amount
      // - For pushes: refund the stake
      // - For losses: do nothing (stake already gone)
      ...(result.status !== "lost" ? [
        prisma.account.update({
          where: { userId: bet.userId },
          data: {
            balance: {
              increment: payout
            }
          }
        })
      ] : [])
    ]);

    console.log(`[settleBet] Bet ${betId} settled as ${result.status}, payout: $${payout.toFixed(2)}`);

    return {
      betId,
      status: result.status,
      payout,
      legs: legResults
    };

  } catch (error) {
    console.error(`[settleBet] Error settling bet ${betId}:`, error);
    return null;
  }
}

/**
 * Grade all legs of a parlay bet
 */
async function gradeParlayLegs(bet: { legs: unknown }): Promise<LegGradingResult[]> {
  const legs = bet.legs ? JSON.parse(JSON.stringify(bet.legs)) : [];
  const results: LegGradingResult[] = [];

  for (const leg of legs) {
    // Fetch game for this leg
    const game = await prisma.game.findUnique({
      where: { id: leg.gameId }
    });

    if (!game || game.homeScore === null || game.awayScore === null) {
      results.push({
        legId: leg.id,
        status: "push",
        reason: "Game data unavailable"
      });
      continue;
    }

    let legResult: BetGradingResult;

    switch (leg.betType) {
      case "spread":
        legResult = gradeSpreadBet({
          selection: leg.selection,
          line: leg.line ?? 0,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;

      case "moneyline":
        legResult = gradeMoneylineBet({
          selection: leg.selection,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;

      case "total":
        legResult = gradeTotalBet({
          selection: leg.selection,
          line: leg.line ?? 0,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;

      case "player_prop":
        // Extract player prop metadata from leg
        if (!leg.playerProp?.playerId || !leg.playerProp?.statType) {
          console.error(`[gradeParlayLegs] Player prop leg missing metadata:`, leg);
          legResult = { status: "push", reason: "Missing player prop metadata" };
        } else if (!leg.gameId) {
          console.error(`[gradeParlayLegs] Player prop leg missing gameId:`, leg);
          legResult = { status: "push", reason: "Missing gameId" };
        } else {
          // ✅ Fetch actual player stats
          console.log(`[gradeParlayLegs] Fetching player stats for ${leg.playerProp.playerId} in game ${leg.gameId}`);
          const playerStats = await fetchPlayerStats(leg.gameId, leg.playerProp.playerId);
          
          if (!playerStats) {
            console.warn(`[gradeParlayLegs] Player stats unavailable - cannot grade this leg yet`);
            throw new Error(`Player stats unavailable for parlay leg - cannot settle yet`);
          }
          
          legResult = gradePlayerPropBet({
            selection: leg.selection,
            line: leg.line ?? 0,
            playerId: leg.playerProp.playerId,
            statType: leg.playerProp.statType
          }, playerStats);
        }
        break;

      case "game_prop":
        // Extract game prop metadata from leg
        if (!leg.gameProp?.propType) {
          console.error(`[gradeParlayLegs] Game prop leg missing propType:`, leg);
          legResult = { status: "push", reason: "Missing game prop metadata" };
        } else {
          // Check if this is a period/quarter prop
          let periodScoresForLeg: { home: number; away: number } | null = null;
          if (leg.gameProp.periodID && leg.gameId) {
            console.log(`[gradeParlayLegs] Fetching period ${leg.gameProp.periodID} scores for game ${leg.gameId}`);
            periodScoresForLeg = await getPeriodScore(leg.gameId, leg.gameProp.periodID);
            
            if (!periodScoresForLeg) {
              console.warn(`[gradeParlayLegs] Period ${leg.gameProp.periodID} scores unavailable - cannot grade this leg yet`);
              throw new Error(`Period scores unavailable for parlay leg - cannot settle yet`);
            }
          }

          legResult = gradeGamePropBet({
            propType: leg.gameProp.propType,
            selection: leg.selection,
            line: leg.line ?? undefined,
            homeScore: game.homeScore,
            awayScore: game.awayScore
          }, periodScoresForLeg);
        }
        break;

      default:
        console.warn(`[gradeParlayLegs] Unsupported leg type: ${leg.betType}`);
        legResult = { status: "push", reason: "Unsupported leg type" };
    }

    results.push({
      legId: leg.id,
      status: legResult.status,
      reason: legResult.reason || ""
    });
  }

  return results;
}

/**
 * Grade all legs of a teaser bet (with adjusted lines)
 */
async function gradeTeaserLegs(bet: { legs: unknown }): Promise<LegGradingResult[]> {
  // Similar to parlay, but need to calculate adjusted lines first
  // For now, delegate to same logic as parlay
  return gradeParlayLegs(bet);
}

// ============================================================================
// ADVANCED BET TYPE SETTLEMENT
// ============================================================================

/**
 * Settle an If Bet
 * 
 * If Bets are conditional bets where legs are activated sequentially.
 * - First leg must win (or tie if condition is "if_win_or_tie")
 * - If first leg wins, second leg is activated with winnings as stake
 * - Process continues through all legs
 * - Any loss stops the chain
 */
export async function settleIfBet(bet: { id: string; stake: number; legs: unknown }): Promise<SettlementResult | null> {
  const legs = bet.legs ? JSON.parse(JSON.stringify(bet.legs)) : [];
  const metadata = bet.legs ? JSON.parse(JSON.stringify(bet.legs)) : {};
  const condition = metadata.condition || "if_win_only";

  let currentStake = bet.stake;
  let allLegsSettled = true;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    
    // Fetch game for this leg
    const game = await prisma.game.findUnique({
      where: { id: leg.gameId }
    });

    if (!game || game.status !== "finished" || game.homeScore === null || game.awayScore === null) {
      allLegsSettled = false;
      break;
    }

    // Grade this leg
    let legResult: BetGradingResult;
    switch (leg.betType) {
      case "spread":
        legResult = gradeSpreadBet({
          selection: leg.selection,
          line: leg.line,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      case "moneyline":
        legResult = gradeMoneylineBet({
          selection: leg.selection,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      case "total":
        legResult = gradeTotalBet({
          selection: leg.selection,
          line: leg.line,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      default:
        return null;
    }

    // Check if leg won/pushed/lost
    if (legResult.status === "lost") {
      // If any leg loses, entire if-bet loses
      return {
        betId: bet.id,
        status: "lost",
        payout: 0
      };
    }

    if (legResult.status === "push" && condition === "if_win_only") {
      // Push on win-only condition = entire bet pushes
      return {
        betId: bet.id,
        status: "push",
        payout: bet.stake
      };
    }

    // Leg won or pushed with if_win_or_tie - calculate new stake for next leg
    if (legResult.status === "won") {
      const decimalOdds = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
      currentStake = currentStake * decimalOdds;
    }
    // If push with if_win_or_tie, stake stays the same
  }

  if (!allLegsSettled) {
    // Not all games finished yet
    return null;
  }

  // All legs won/pushed appropriately
  return {
    betId: bet.id,
    status: "won",
    payout: currentStake
  };
}

/**
 * Settle a Reverse Bet
 * 
 * Reverse bets are two if-bets in opposite order.
 * Each direction is settled independently.
 */
export async function settleReverseBet(_bet: { id: string; stake: number; legs: unknown }): Promise<SettlementResult | null> {
  // Reverse bet is essentially two if-bets
  // Would need to track each direction separately in bet.legs metadata
  // For now, use similar logic to if-bet but handle both directions
  
  // TODO: Implement full reverse bet settlement
  // This requires storing both if-bet directions in metadata
  return null;
}

/**
 * Settle a Bet It All
 * 
 * Similar to if-bet but all winnings roll to next leg automatically.
 * More aggressive than if-bet - true progressive betting.
 */
export async function settleBetItAll(bet: { id: string; stake: number; legs: unknown }): Promise<SettlementResult | null> {
  // Very similar to if-bet, but always "if_win_only" and all winnings roll forward
  return settleIfBet(bet);
}

/**
 * Settle a Round Robin
 * 
 * Round robin creates multiple parlays from selected legs.
 * Each parlay is settled independently.
 * Total payout is sum of all winning parlays.
 */
export async function settleRoundRobin(bet: { id: string; stake: number; legs: unknown }): Promise<SettlementResult | null> {
  const parlayResults = bet.legs ? JSON.parse(JSON.stringify(bet.legs)) : [];
  
  // Each "leg" in a round robin is actually a parlay
  let totalPayout = 0;
  let wonParlays = 0;
  let pushParlays = 0;

  for (const parlayData of parlayResults) {
    const legResults = await gradeParlayLegsFromData(parlayData.legs);
    const parlayResult = gradeParlayBet(legResults);

    if (parlayResult.status === "won") {
      wonParlays++;
      totalPayout += parlayData.potentialPayout || 0;
    } else if (parlayResult.status === "lost") {
      // Count lost parlays but don't need to track for payout
      continue;
    } else {
      pushParlays++;
      totalPayout += parlayData.stake || 0;
    }
  }

  // Determine overall round robin status
  if (wonParlays === 0 && pushParlays === 0) {
    return { betId: bet.id, status: "lost", payout: 0 };
  }

  if (wonParlays > 0) {
    return { betId: bet.id, status: "won", payout: totalPayout };
  }

  return { betId: bet.id, status: "push", payout: totalPayout };
}

/**
 * Helper to grade parlay legs from data
 */
async function gradeParlayLegsFromData(legs: { id: string; gameId: string; betType: string; selection: string; line?: number }[]): Promise<LegGradingResult[]> {
  const results: LegGradingResult[] = [];

  for (const leg of legs) {
    const game = await prisma.game.findUnique({
      where: { id: leg.gameId }
    });

    if (!game || game.homeScore === null || game.awayScore === null) {
      results.push({
        legId: leg.id,
        status: "push",
        reason: "Game data unavailable"
      });
      continue;
    }

    let legResult: BetGradingResult;

    switch (leg.betType) {
      case "spread":
        legResult = gradeSpreadBet({
          selection: leg.selection,
          line: leg.line ?? 0,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      case "moneyline":
        legResult = gradeMoneylineBet({
          selection: leg.selection,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      case "total":
        legResult = gradeTotalBet({
          selection: leg.selection,
          line: leg.line ?? 0,
          homeScore: game.homeScore,
          awayScore: game.awayScore
        });
        break;
      default:
        legResult = { status: "push", reason: "Unsupported leg type" };
    }

    results.push({
      legId: leg.id,
      status: legResult.status,
      reason: legResult.reason || ""
    });
  }

  return results;
}

// ============================================================================
// BATCH SETTLEMENT
// ============================================================================

/**
 * Settle all pending bets for a finished game
 * 
 * Called when a game transitions to "finished" status.
 * Settles all pending bets associated with that game.
 */
export async function settleGameBets(gameId: string): Promise<SettlementResult[]> {
  try {
    console.log(`[settleGameBets] Settling all bets for game ${gameId}`);

    // Find all pending bets for this game
    const pendingBets = await prisma.bet.findMany({
      where: {
        gameId,
        status: "pending"
      }
    });

    console.log(`[settleGameBets] Found ${pendingBets.length} pending bets to settle`);

    const results: SettlementResult[] = [];

    for (const bet of pendingBets) {
      const result = await settleBet(bet.id);
      if (result) {
        results.push(result);
      }
    }

    console.log(`[settleGameBets] Successfully settled ${results.length} bets for game ${gameId}`);

    return results;

  } catch (error) {
    console.error(`[settleGameBets] Error settling bets for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Settle all pending bets across all finished games
 * 
 * This would typically be run as a cron job every few minutes
 * to ensure bets are settled promptly after games finish.
 */
export async function settleAllFinishedGames(): Promise<{
  gamesProcessed: number;
  betsSettled: number;
  results: SettlementResult[];
}> {
  try {
    console.log(`[settleAllFinishedGames] Starting settlement run...`);

    // Find all finished games that might have pending bets
    const finishedGames = await prisma.game.findMany({
      where: {
        status: "finished",
        bets: {
          some: {
            status: "pending"
          }
        }
      },
      select: {
        id: true
      }
    });

    console.log(`[settleAllFinishedGames] Found ${finishedGames.length} games with pending single bets`);

    const allResults: SettlementResult[] = [];

    // Settle single bets on finished games
    for (const game of finishedGames) {
      const results = await settleGameBets(game.id);
      allResults.push(...results);
    }

    // Also check for pending multi-leg bets (parlays, teasers, etc.)
    const pendingMultiLegBets = await prisma.bet.findMany({
      where: {
        status: "pending",
        betType: {
          in: ["parlay", "teaser", "if_bet", "reverse", "bet_it_all", "round_robin"]
        }
      },
      select: {
        id: true,
        legs: true
      }
    });

    console.log(`[settleAllFinishedGames] Found ${pendingMultiLegBets.length} pending multi-leg bets`);

    // Check each multi-leg bet to see if all its games are finished
    for (const bet of pendingMultiLegBets) {
      if (!bet.legs || !Array.isArray(bet.legs)) continue;

      const legs = bet.legs as Array<{ gameId?: string }>;
      const gameIds = legs.map(leg => leg.gameId).filter(Boolean) as string[];

      if (gameIds.length === 0) continue;

      // Check if all games are finished
      const games = await prisma.game.findMany({
        where: {
          id: { in: gameIds },
          status: "finished"
        },
        select: { id: true }
      });

      // If all games are found and finished, settle the bet
      if (games.length === gameIds.length) {
        console.log(`[settleAllFinishedGames] All games finished for multi-leg bet ${bet.id}, settling...`);
        const result = await settleBet(bet.id);
        if (result) {
          allResults.push(result);
        }
      }
    }

    console.log(`[settleAllFinishedGames] Settlement run complete. ` +
      `Processed ${finishedGames.length} games, settled ${allResults.length} bets`);

    return {
      gamesProcessed: finishedGames.length,
      betsSettled: allResults.length,
      results: allResults
    };

  } catch (error) {
    console.error(`[settleAllFinishedGames] Error during settlement run:`, error);
    return {
      gamesProcessed: 0,
      betsSettled: 0,
      results: []
    };
  }
}
