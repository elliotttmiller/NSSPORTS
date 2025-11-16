/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reverse Bet Placement API
 * 
 * Creates if bets in both directions for all permutations of selections.
 * - Win Reverse: Trigger next bet only on wins
 * - Action Reverse: Trigger next bet on wins, pushes, or cancellations
 * 
 * Example: 2 selections (A, B) creates 2 sequences: A→B and B→A
 * Example: 3 selections creates 6 sequences (all permutations)
 * 
 * Industry standard: 2-4 selections maximum due to exponential growth
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authHelpers";
import { validateReverseBet, checkMinimumStakeRule, checkMaximumStakeRule } from "@/lib/betting-rules";
import { generateReverseSequences } from "@/types/advanced-bets";
import type { Bet } from "@/types";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";

// Validation schema for Reverse Bet placement
const ReverseBetSchema = z.object({
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
  })).min(2).max(4),
  type: z.enum(["win_reverse", "action_reverse"]),
  stakePerSequence: z.number().positive(),
});

/**
 * Calculate potential payout for a sequence
 * Each bet's winnings compound into the next bet in the sequence
 */
function calculateSequencePayout(sequence: any[], initialStake: number): number {
  let currentStake = initialStake;
  
  for (const bet of sequence) {
    const decimalOdds = bet.odds > 0 
      ? (bet.odds / 100) + 1 
      : (100 / Math.abs(bet.odds)) + 1;
    currentStake = currentStake * decimalOdds;
  }
  
  return currentStake;
}

/**
 * POST /api/reverse-bets
 * Place a Reverse Bet
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    logger.info('[reverse-bets] Processing Reverse Bet placement');
    
    const userId = await getAuthUser();
    const body = await req.json();
    
    // Validate request body
    const validation = ReverseBetSchema.safeParse(body);
    if (!validation.success) {
      logger.error('[reverse-bets] Validation failed:', validation.error);
      return ApiErrors.badRequest('Invalid Reverse Bet data', {
        errors: validation.error.errors,
      });
    }
    
    const { selections, type, stakePerSequence } = validation.data;
    
    // Validate Reverse Bet
    const violation = validateReverseBet(selections as any as Bet[]);
    if (violation) {
      logger.error('[reverse-bets] Validation failed:', violation);
      return ApiErrors.badRequest(violation.message);
    }
    
    // Validate stake
    const minStakeCheck = checkMinimumStakeRule(stakePerSequence);
    if (minStakeCheck) {
      return ApiErrors.badRequest(minStakeCheck.message);
    }
    
    // Generate all sequences (permutations)
    const betIds = selections.map(s => s.id);
    const sequenceOrders = generateReverseSequences(betIds);
    
    // Create sequence data for each permutation
    const sequences = sequenceOrders.map(order => {
      const orderedSelections = order.map(id => 
        selections.find(s => s.id === id)!
      );
      const potentialPayout = calculateSequencePayout(orderedSelections, stakePerSequence);
      
      return {
        order,
        legs: orderedSelections,
        potentialPayout,
      };
    });
    
    const totalStake = sequences.length * stakePerSequence;
    const totalPotentialPayout = sequences.reduce(
      (sum, seq) => sum + seq.potentialPayout,
      0
    );
    
    // Validate max stake/payout for total
    const maxStakeCheck = checkMaximumStakeRule(totalStake, totalPotentialPayout);
    if (maxStakeCheck) {
      return ApiErrors.badRequest(maxStakeCheck.message);
    }
    
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
          return ApiErrors.badRequest(`Cannot place reverse bet with finished game: ${selection.gameId}`);
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
      
      // Create Reverse Bet record
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: null, // Reverse Bet spans multiple games
          betType: 'reverse',
          selection: `${type === 'win_reverse' ? 'Win' : 'Action'} Reverse (${sequences.length} sequences)`,
          odds: 0, // Variable, depends on execution
          line: null,
          stake: totalStake,
          potentialPayout: totalPotentialPayout,
          status: 'pending',
          legs: JSON.stringify({
            type,
            stakePerSequence,
            selections: selections.map(s => ({
              id: s.id,
              gameId: s.gameId,
              betType: s.betType,
              selection: s.selection,
              odds: s.odds,
              line: s.line,
              playerProp: s.playerProp,
              gameProp: s.gameProp,
            })),
            sequences: sequences.map(seq => ({
              order: seq.order,
              legIndexes: seq.order.map(id => 
                selections.findIndex(s => s.id === id)
              ),
              potentialPayout: seq.potentialPayout,
              status: 'pending',
            })),
          }),
        },
      });
      
      return bet;
    });
    
    logger.info(`[reverse-bets] Reverse Bet placed successfully:`, {
      betId: result.id,
      type,
      numSequences: sequences.length,
      totalStake,
      userId,
    });
    
    return successResponse({
      message: 'Reverse Bet placed successfully',
      bet: {
        id: result.id,
        betType: result.betType,
        type,
        numSequences: sequences.length,
        stakePerSequence,
        totalStake,
        totalPotentialPayout,
        sequences: sequences.map(s => ({
          order: s.order.map(id => selections.find(sel => sel.id === id)?.selection),
          potentialPayout: s.potentialPayout,
        })),
        status: result.status,
        placedAt: result.placedAt,
      },
    }, 201);
  });
}
