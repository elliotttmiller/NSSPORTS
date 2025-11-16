/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Round Robin Bet Placement API
 * 
 * Handles placement of Round Robin bets which create multiple parlays
 * from a set of selections using k-combinations.
 * 
 * Industry standard: 3-8 selections, parlay sizes 2-7
 * Example: 4 selections "by 2's" creates 6 two-team parlays
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authHelpers";
import { 
  validateRoundRobinBet, 
  checkMinimumStakeRule, 
  checkMaximumStakeRule 
} from "@/lib/betting-rules";
import { 
  generateCombinations, 
  ROUND_ROBIN_CONFIGS 
} from "@/types/advanced-bets";
import type { RoundRobinType } from "@/types/advanced-bets";
import type { Bet } from "@/types";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";

// Validation schema for Round Robin bet placement
const RoundRobinBetSchema = z.object({
  selections: z.array(z.object({
    id: z.string(),
    gameId: z.string(),
    betType: z.enum(["spread", "moneyline", "total", "player_prop", "game_prop"]),
    selection: z.string(),
    odds: z.number(),
    line: z.number().optional(),
    playerProp: z.object({
      playerId: z.string(),
      playerName: z.string(),
      statType: z.string(),
      category: z.string(),
    }).optional(),
    gameProp: z.object({
      marketCategory: z.string(),
      propType: z.string(),
      description: z.string(),
    }).optional(),
  })).min(3).max(8),
  roundRobinTypes: z.array(z.enum([
    "by_2s", "by_3s", "by_4s", "by_5s", "by_6s", "by_7s", "by_8s"
  ])).min(1),
  stakePerParlay: z.number().positive(),
});

/**
 * Calculate parlay odds from multiple selections
 */
function calculateParlayOdds(bets: any[]): number {
  let combinedDecimalOdds = 1;
  
  for (const bet of bets) {
    const decimalOdds = bet.odds > 0 
      ? (bet.odds / 100) + 1 
      : (100 / Math.abs(bet.odds)) + 1;
    combinedDecimalOdds *= decimalOdds;
  }
  
  // Convert back to American odds
  const americanOdds = combinedDecimalOdds >= 2 
    ? Math.round((combinedDecimalOdds - 1) * 100)
    : Math.round(-100 / (combinedDecimalOdds - 1));
  
  return americanOdds;
}

/**
 * Calculate parlay payout
 */
function calculateParlayPayout(stake: number, odds: number): number {
  const decimalOdds = odds > 0 
    ? (odds / 100) + 1 
    : (100 / Math.abs(odds)) + 1;
  return stake * decimalOdds;
}

/**
 * POST /api/round-robin
 * Place a Round Robin bet
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    logger.info('[round-robin] Processing Round Robin bet placement');
    
    const userId = await getAuthUser();
    const body = await req.json();
    
    // Validate request body
    const validation = RoundRobinBetSchema.safeParse(body);
    if (!validation.success) {
      logger.error('[round-robin] Validation failed:', validation.error);
      return ApiErrors.badRequest('Invalid Round Robin bet data', {
        errors: validation.error.errors,
      });
    }
    
    const { selections, roundRobinTypes, stakePerParlay } = validation.data;
    
    // Validate Round Robin bet
    const violation = validateRoundRobinBet(
      selections as any as Bet[],
      2 // We'll validate each type separately
    );
    if (violation) {
      logger.error('[round-robin] Validation failed:', violation);
      return ApiErrors.badRequest(violation.message);
    }
    
    // Validate stake
    const minStakeCheck = checkMinimumStakeRule(stakePerParlay);
    if (minStakeCheck) {
      return ApiErrors.badRequest(minStakeCheck.message);
    }
    
    // Generate all parlays for all selected types
    const allParlays: Array<{
      type: RoundRobinType;
      legs: any[];
      odds: number;
      stake: number;
      potentialPayout: number;
    }> = [];
    
    for (const rrType of roundRobinTypes) {
      const config = ROUND_ROBIN_CONFIGS[rrType];
      const parlaySize = config.parlaySize;
      
      // Validate parlay size
      if (parlaySize > selections.length) {
        return ApiErrors.badRequest(
          `Cannot create ${config.displayName} with only ${selections.length} selections`
        );
      }
      
      // Generate combinations
      const combinations = generateCombinations(selections, parlaySize);
      
      // Create parlay for each combination
      for (const combo of combinations) {
        const parlayOdds = calculateParlayOdds(combo);
        const potentialPayout = calculateParlayPayout(stakePerParlay, parlayOdds);
        
        // Validate max stake/payout
        const maxStakeCheck = checkMaximumStakeRule(stakePerParlay, potentialPayout);
        if (maxStakeCheck) {
          return ApiErrors.badRequest(maxStakeCheck.message);
        }
        
        allParlays.push({
          type: rrType,
          legs: combo,
          odds: parlayOdds,
          stake: stakePerParlay,
          potentialPayout,
        });
      }
    }
    
    const totalStake = allParlays.length * stakePerParlay;
    const totalPotentialPayout = allParlays.reduce(
      (sum, parlay) => sum + parlay.potentialPayout,
      0
    );
    
    // === INDUSTRY STANDARD: VALIDATE MARKET CLOSURE FOR ALL SELECTIONS ===
    {
      const { validateBetPlacement, isPeriodCompleted } = await import("@/lib/market-closure-rules");
      
      // Collect all unique game IDs from selections
      const gameIds = Array.from(new Set(selections.map((sel: any) => sel.gameId).filter(Boolean)));
      
      // Fetch game states
      const games = await prisma.game.findMany({
        where: { id: { in: gameIds } },
        select: {
          id: true,
          status: true,
          startTime: true,
          homeScore: true,
          awayScore: true,
          period: true,
          timeRemaining: true,
          inning: true,
          league: {
            select: { id: true }
          }
        },
      });
      
      // Create a map for quick lookup
      const gameMap = new Map(games.map(g => [g.id, g]));
      
      // Validate each selection
      for (const selection of selections) {
        if (!selection.gameId) continue;
        
        const game = gameMap.get(selection.gameId);
        if (!game) {
          return ApiErrors.badRequest(`Game not found: ${selection.gameId}`);
        }
        
        if (game.status === "finished") {
          return ApiErrors.badRequest(`Cannot place round robin bet with finished game: ${selection.gameId}`);
        }
        
        // Check market closure for live games
        if (game.status === "live") {
          const gameState = {
            leagueId: game.league?.id as any,
            status: game.status,
            startTime: game.startTime,
            homeScore: game.homeScore ?? undefined,
            awayScore: game.awayScore ?? undefined,
            period: game.period ?? undefined,
            timeRemaining: game.timeRemaining ?? undefined,
            inning: game.inning ?? undefined,
          };
          
          const validationError = validateBetPlacement(gameState);
          if (validationError) {
            return ApiErrors.badRequest(`Selection for game ${selection.gameId}: ${validationError}`);
          }
          
          // Check if this is a game prop with a completed period
          if (selection.betType === "game_prop" && selection.gameProp?.periodID) {
            if (isPeriodCompleted(selection.gameProp.periodID, gameState)) {
              return ApiErrors.badRequest(`Selection for game ${selection.gameId}: Cannot bet on ${selection.gameProp.periodID.toUpperCase()} - period has already completed`);
            }
          }
        }
      }
    }
    
    // Check user balance
    const account = await prisma.account.findUnique({
      where: { userId },
    });
    
    if (!account || account.balance < totalStake) {
      return ApiErrors.badRequest('Insufficient balance');
    }
    
    // Create bet record and deduct balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.account.update({
        where: { userId },
        data: { balance: { decrement: totalStake } },
      });
      
      // Create Round Robin bet record
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: null, // Round Robin spans multiple games
          betType: 'round_robin',
          selection: `Round Robin (${allParlays.length} parlays)`,
          odds: 0, // Variable odds across parlays
          line: null,
          stake: totalStake,
          potentialPayout: totalPotentialPayout,
          status: 'pending',
          legs: JSON.stringify({
            selections: selections.map(s => ({
              gameId: s.gameId,
              betType: s.betType,
              selection: s.selection,
              odds: s.odds,
              line: s.line,
              playerProp: s.playerProp,
              gameProp: s.gameProp,
            })),
            roundRobinTypes,
            stakePerParlay,
            parlays: allParlays.map(p => ({
              type: p.type,
              legIndexes: p.legs.map(leg => 
                selections.findIndex(s => s.id === leg.id)
              ),
              odds: p.odds,
              stake: p.stake,
              potentialPayout: p.potentialPayout,
            })),
          }),
        },
        include: {
          game: {
            include: {
              homeTeam: true,
              awayTeam: true,
              league: true,
            },
          },
        },
      });
      
      return bet;
    });
    
    logger.info(`[round-robin] Round Robin bet placed successfully:`, {
      betId: result.id,
      numParlays: allParlays.length,
      totalStake,
      userId,
    });
    
    return successResponse({
      message: 'Round Robin bet placed successfully',
      bet: {
        id: result.id,
        betType: result.betType,
        totalStake,
        totalPotentialPayout,
        numParlays: allParlays.length,
        parlays: allParlays,
        status: result.status,
        placedAt: result.placedAt,
      },
    }, 201);
  });
}
