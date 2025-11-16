/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bet It All (Progressive Chain) API
 * 
 * All winnings from each bet are automatically placed on the next bet.
 * Progressive stake calculation with all-or-nothing settlement.
 * 
 * Industry standard: 2-6 legs maximum
 * One loss resets to zero (if allOrNothing is true)
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from "next/server";
import type { LeagueID } from '@/types/game';
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authHelpers";
import { validateBetItAll, checkMinimumStakeRule, checkMaximumStakeRule } from "@/lib/betting-rules";
import type { Bet } from "@/types";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";

// Validation schema for Bet It All placement
const BetItAllSchema = z.object({
  legs: z.array(z.object({
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
  })).min(2).max(6),
  initialStake: z.number().positive(),
  allOrNothing: z.boolean().default(true),
});

/**
 * Calculate progressive payouts for Bet It All chain
 * Each leg's total payout becomes the stake for the next leg
 */
function calculateProgressivePayouts(legs: any[], initialStake: number): Array<{
  legIndex: number;
  stake: number;
  potentialPayout: number;
}> {
  const payouts = [];
  let currentStake = initialStake;
  
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const decimalOdds = leg.odds > 0 
      ? (leg.odds / 100) + 1 
      : (100 / Math.abs(leg.odds)) + 1;
    
    const potentialPayout = currentStake * decimalOdds;
    
    payouts.push({
      legIndex: i,
      stake: currentStake,
      potentialPayout,
    });
    
    // Next leg's stake is this leg's total payout
    currentStake = potentialPayout;
  }
  
  return payouts;
}

/**
 * POST /api/bet-it-all
 * Place a Bet It All (progressive chain) bet
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    logger.info('[bet-it-all] Processing Bet It All placement');
    
    const userId = await getAuthUser();
    const body = await req.json();
    
    // Validate request body
    const validation = BetItAllSchema.safeParse(body);
    if (!validation.success) {
      logger.error('[bet-it-all] Validation failed:', validation.error);
      return ApiErrors.badRequest('Invalid Bet It All data', {
        errors: validation.error.errors,
      });
    }
    
    const { legs, initialStake, allOrNothing } = validation.data;
    
    // Validate Bet It All
    const violation = validateBetItAll(legs as any as Bet[]);
    if (violation) {
      logger.error('[bet-it-all] Validation failed:', violation);
      return ApiErrors.badRequest(violation.message);
    }
    
    // Validate stake
    const minStakeCheck = checkMinimumStakeRule(initialStake);
    if (minStakeCheck) {
      return ApiErrors.badRequest(minStakeCheck.message);
    }
    
    // Calculate progressive payouts
    const progressivePayouts = calculateProgressivePayouts(legs, initialStake);
    const finalPotentialPayout = progressivePayouts[progressivePayouts.length - 1].potentialPayout;
    
    // Validate max payout
    const maxStakeCheck = checkMaximumStakeRule(initialStake, finalPotentialPayout);
    if (maxStakeCheck) {
      return ApiErrors.badRequest(maxStakeCheck.message);
    }
    
    // === INDUSTRY STANDARD: VALIDATE MARKET CLOSURE FOR ALL LEGS ===
    {
      const { validateBetPlacement, isPeriodCompleted } = await import("@/lib/market-closure-rules");
      
      // Collect all unique game IDs from legs
      const gameIds = Array.from(new Set(legs.map((leg: any) => leg.gameId).filter(Boolean)));
      
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
          league: {
            select: { id: true }
          }
        },
      });
      
      // Create a map for quick lookup
      const gameMap = new Map(games.map(g => [g.id, g]));
      
      // Validate each leg
      for (const leg of legs) {
        if (!leg.gameId) continue;
        
        const game = gameMap.get(leg.gameId);
        if (!game) {
          return ApiErrors.badRequest(`Game not found: ${leg.gameId}`);
        }
        
        if (game.status === "finished") {
          return ApiErrors.badRequest(`Cannot place bet-it-all with finished game: ${leg.gameId}`);
        }
        
        // Check market closure for live games
        if (game.status === "live") {
            const gameState = {
              leagueId: game.league?.id as unknown as LeagueID,
            // Cast status to the GameState union expected by market-closure-rules
            status: game.status as 'upcoming' | 'live' | 'finished',
            // Ensure startTime is a string (some validators expect ISO strings)
            startTime: game.startTime instanceof Date ? game.startTime.toISOString() : String(game.startTime),
            homeScore: game.homeScore ?? undefined,
            awayScore: game.awayScore ?? undefined,
            period: game.period ?? undefined,
            timeRemaining: game.timeRemaining ?? undefined,
          };
          
          const validationError = validateBetPlacement(gameState);
          if (validationError) {
            return ApiErrors.badRequest(`Leg for game ${leg.gameId}: ${validationError}`);
          }
          
          // Check if this is a game prop with a completed period
          // Some stored gameProp shapes don't have periodID typed; guard defensively
          const legPeriodID = (leg.gameProp as any)?.periodID as string | undefined;
          if (leg.betType === "game_prop" && legPeriodID) {
            if (isPeriodCompleted(legPeriodID, gameState)) {
              return ApiErrors.badRequest(`Leg for game ${leg.gameId}: Cannot bet on ${legPeriodID.toUpperCase()} - period has already completed`);
            }
          }
        }
      }
    }
    
    // Check user balance
    const account = await prisma.account.findUnique({
      where: { userId },
    });
    
    if (!account || account.balance < initialStake) {
      return ApiErrors.badRequest('Insufficient balance');
    }
    
    // Create bet record and deduct balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct initial stake only
      await tx.account.update({
        where: { userId },
        data: { balance: { decrement: initialStake } },
      });
      
      // Create Bet It All record
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: null, // Bet It All spans multiple games
          betType: 'bet_it_all',
          selection: `Bet It All (${legs.length} legs)`,
          odds: 0, // Variable, progressive
          line: null,
          stake: initialStake,
          potentialPayout: finalPotentialPayout,
          status: 'pending',
          legs: JSON.stringify({
            allOrNothing,
            initialStake,
            legs: legs.map((leg, index) => ({
              order: index + 1,
              gameId: leg.gameId,
              betType: leg.betType,
              selection: leg.selection,
              odds: leg.odds,
              line: leg.line,
              playerProp: leg.playerProp,
              gameProp: leg.gameProp,
              status: index === 0 ? 'active' : 'pending',
              stake: progressivePayouts[index].stake,
              potentialPayout: progressivePayouts[index].potentialPayout,
            })),
          }),
        },
      });
      
      return bet;
    });
    
    logger.info(`[bet-it-all] Bet It All placed successfully:`, {
      betId: result.id,
      numLegs: legs.length,
      initialStake,
      finalPotentialPayout,
      userId,
    });
    
    return successResponse({
      message: 'Bet It All placed successfully',
      bet: {
        id: result.id,
        betType: result.betType,
        numLegs: legs.length,
        initialStake,
        finalPotentialPayout,
        allOrNothing,
        progressivePayouts: progressivePayouts.map((p, i) => ({
          leg: i + 1,
          stake: p.stake,
          potentialPayout: p.potentialPayout,
        })),
        status: result.status,
        placedAt: result.placedAt,
      },
    }, 201);
  });
}
