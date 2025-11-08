/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * If Bet (Conditional Bet) Placement API
 * 
 * Handles conditional betting where next bet is placed only if condition is met.
 * - If Win Only: Next bet only if previous wins
 * - If Win or Tie: Next bet if previous wins or pushes
 * 
 * Industry standard: 2-5 legs, sequential execution
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authHelpers";
import { validateIfBet, checkMinimumStakeRule, checkMaximumStakeRule } from "@/lib/betting-rules";
import type { Bet } from "@/types";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";

// Validation schema for If Bet placement
const IfBetSchema = z.object({
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
  })).min(2).max(5),
  condition: z.enum(["if_win_only", "if_win_or_tie"]),
  initialStake: z.number().positive(),
});

/**
 * Calculate potential payout for If Bet
 * Each leg's potential winnings become the stake for the next leg
 */
function calculateIfBetPayout(legs: any[], initialStake: number): number {
  let currentStake = initialStake;
  
  for (const leg of legs) {
    const decimalOdds = leg.odds > 0 
      ? (leg.odds / 100) + 1 
      : (100 / Math.abs(leg.odds)) + 1;
    currentStake = currentStake * decimalOdds;
  }
  
  return currentStake;
}

/**
 * POST /api/if-bets
 * Place an If Bet (conditional bet)
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    logger.info('[if-bets] Processing If Bet placement');
    
    const userId = await getAuthUser();
    const body = await req.json();
    
    // Validate request body
    const validation = IfBetSchema.safeParse(body);
    if (!validation.success) {
      logger.error('[if-bets] Validation failed:', validation.error);
      return ApiErrors.badRequest('Invalid If Bet data', {
        errors: validation.error.errors,
      });
    }
    
    const { legs, condition, initialStake } = validation.data;
    
    // Validate If Bet
    const violation = validateIfBet(legs as any as Bet[]);
    if (violation) {
      logger.error('[if-bets] Validation failed:', violation);
      return ApiErrors.badRequest(violation.message);
    }
    
    // Validate stake
    const minStakeCheck = checkMinimumStakeRule(initialStake);
    if (minStakeCheck) {
      return ApiErrors.badRequest(minStakeCheck.message);
    }
    
    const potentialPayout = calculateIfBetPayout(legs, initialStake);
    
    // Validate max payout
    const maxStakeCheck = checkMaximumStakeRule(initialStake, potentialPayout);
    if (maxStakeCheck) {
      return ApiErrors.badRequest(maxStakeCheck.message);
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
      // Deduct balance
      await tx.account.update({
        where: { userId },
        data: { balance: { decrement: initialStake } },
      });
      
      // Create If Bet record
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: null, // If Bet spans multiple games
          betType: 'if_bet',
          selection: `If Bet (${condition}, ${legs.length} legs)`,
          odds: 0, // Variable, depends on execution
          line: null,
          stake: initialStake,
          potentialPayout,
          status: 'pending',
          legs: JSON.stringify({
            condition,
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
            })),
          }),
        },
      });
      
      return bet;
    });
    
    logger.info(`[if-bets] If Bet placed successfully:`, {
      betId: result.id,
      condition,
      numLegs: legs.length,
      initialStake,
      userId,
    });
    
    return successResponse({
      message: 'If Bet placed successfully',
      bet: {
        id: result.id,
        betType: result.betType,
        condition,
        numLegs: legs.length,
        initialStake,
        potentialPayout,
        status: result.status,
        placedAt: result.placedAt,
      },
    }, 201);
  });
}
