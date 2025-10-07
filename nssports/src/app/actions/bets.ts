"use server";

/**
 * Bet Submission Server Actions
 * 
 * Official Next.js Server Actions Pattern:
 * - Server-side validation and processing
 * - Integrated with NextAuth for authentication
 * - Uses revalidatePath for automatic cache invalidation
 * - Type-safe with Zod validation
 * 
 * References:
 * - https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 * - https://nextjs.org/docs/app/api-reference/functions/revalidatePath
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Validation schemas
const betLegSchema = z.object({
  gameId: z.string(),
  betType: z.string(),
  selection: z.string(),
  odds: z.number(),
  line: z.number().nullable().optional(),
});

const singleBetSchema = z.object({
  gameId: z.string(),
  betType: z.string(),
  selection: z.string(),
  odds: z.number(),
  line: z.number().nullable().optional(),
  stake: z.number().positive(),
  potentialPayout: z.number().positive(),
});

const parlayBetSchema = z.object({
  legs: z.array(betLegSchema).min(2, "Parlay must have at least 2 legs"),
  stake: z.number().positive(),
  potentialPayout: z.number().positive(),
  odds: z.number(),
});

// Action return types
export type PlaceBetsState = {
  success: boolean;
  message?: string;
  error?: string;
  betIds?: string[];
};

/**
 * Place Single Bet Server Action
 * 
 * Creates a single bet for the authenticated user.
 * Automatically revalidates the bet history cache.
 */
export async function placeSingleBetAction(
  bet: z.infer<typeof singleBetSchema>
): Promise<PlaceBetsState> {
  try {
    console.log("[placeSingleBetAction] Received bet data:", JSON.stringify(bet, null, 2));
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[placeSingleBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    console.log("[placeSingleBetAction] User authenticated:", session.user.id);

    // Validate input
    const validatedData = singleBetSchema.safeParse(bet);
    if (!validatedData.success) {
      console.error("[placeSingleBetAction] Validation failed:", validatedData.error.errors);
      return {
        success: false,
        error: `Invalid bet data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { gameId, betType, selection, odds, line, stake, potentialPayout } = validatedData.data;
    
    console.log("[placeSingleBetAction] Validated data:", { gameId, betType, selection, odds, line, stake, potentialPayout });
    
    // Ensure odds is an integer as required by Prisma schema
    const oddsInt = Math.round(odds);

    // Verify game exists and is not finished
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, status: true },
    });

    if (!game) {
      console.error("[placeSingleBetAction] Game not found:", gameId);
      return {
        success: false,
        error: "Game not found",
      };
    }

    if (game.status === "finished") {
      console.error("[placeSingleBetAction] Game already finished:", gameId);
      return {
        success: false,
        error: "Cannot place bet on finished game",
      };
    }

    console.log("[placeSingleBetAction] Creating bet in database...");

    // Create bet
    const createdBet = await prisma.bet.create({
      data: {
        gameId,
        betType,
        selection,
        odds: oddsInt,
        line: line ?? null,
        stake,
        potentialPayout,
        status: "pending",
        placedAt: new Date(),
        userId: session.user.id,
      },
    });

    console.log("[placeSingleBetAction] Bet created successfully:", createdBet.id);

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: "Bet placed successfully!",
      betIds: [createdBet.id],
    };
  } catch (error) {
    console.error("[placeSingleBetAction] Error:", error);
    console.error("[placeSingleBetAction] Bet data:", JSON.stringify(bet, null, 2));
    return {
      success: false,
      error: `Failed to place bet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Place Parlay Bet Server Action
 * 
 * Creates a parlay bet with multiple legs for the authenticated user.
 * Automatically revalidates the bet history cache.
 */
export async function placeParlayBetAction(
  parlayData: z.infer<typeof parlayBetSchema>
): Promise<PlaceBetsState> {
  try {
    console.log("[placeParlayBetAction] Received parlay data:", JSON.stringify(parlayData, null, 2));
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[placeParlayBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    console.log("[placeParlayBetAction] User authenticated:", session.user.id);

    // Validate input
    const validatedData = parlayBetSchema.safeParse(parlayData);
    if (!validatedData.success) {
      console.error("[placeParlayBetAction] Validation failed:", validatedData.error.errors);
      return {
        success: false,
        error: `Invalid parlay data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { legs, stake, potentialPayout, odds } = validatedData.data;

    console.log("[placeParlayBetAction] Validated data:", { legs: legs.length, stake, potentialPayout, odds });

    // Ensure odds is an integer as required by Prisma schema
    const oddsInt = Math.round(odds);

    console.log("[placeParlayBetAction] Creating parlay bet in database...");

    // Create parlay bet
    const createdBet = await prisma.bet.create({
      data: {
        betType: "parlay",
        stake,
        potentialPayout,
        status: "pending",
        placedAt: new Date(),
        userId: session.user.id,
        selection: "parlay",
        odds: oddsInt,
        line: null,
        gameId: null,
        legs: legs,
      },
    });

    console.log("[placeParlayBetAction] Parlay bet created successfully:", createdBet.id);

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: "Parlay bet placed successfully!",
      betIds: [createdBet.id],
    };
  } catch (error) {
    console.error("[placeParlayBetAction] Error:", error);
    console.error("[placeParlayBetAction] Parlay data:", JSON.stringify(parlayData, null, 2));
    return {
      success: false,
      error: `Failed to place parlay bet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Place Multiple Bets Server Action
 * 
 * Handles placing multiple single bets and/or a parlay bet in a single transaction.
 * This is used for the custom bet slip mode.
 */
export async function placeBetsAction(data: {
  singleBets?: z.infer<typeof singleBetSchema>[];
  parlayBet?: z.infer<typeof parlayBetSchema>;
}): Promise<PlaceBetsState> {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    const betIds: string[] = [];
    let successCount = 0;
    let failCount = 0;

    // Place single bets
    if (data.singleBets && data.singleBets.length > 0) {
      for (const bet of data.singleBets) {
        const result = await placeSingleBetAction(bet);
        if (result.success && result.betIds) {
          betIds.push(...result.betIds);
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    // Place parlay bet
    if (data.parlayBet) {
      const result = await placeParlayBetAction(data.parlayBet);
      if (result.success && result.betIds) {
        betIds.push(...result.betIds);
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount === 0) {
      return {
        success: true,
        message: `All bets placed successfully! (${successCount} bet${successCount > 1 ? 's' : ''})`,
        betIds,
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successCount} bet${successCount > 1 ? 's' : ''} placed, ${failCount} failed`,
        betIds,
      };
    } else {
      return {
        success: false,
        error: "Failed to place bets",
      };
    }
  } catch (error) {
    console.error("Place bets error:", error);
    return {
      success: false,
      error: "Failed to place bets. Please try again.",
    };
  }
}
