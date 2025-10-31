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
  // Player prop metadata for parlay legs
  playerProp: z.object({
    playerId: z.string().optional(),
    playerName: z.string().optional(),
    statType: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  // Game prop metadata for parlay legs
  gameProp: z.object({
    propType: z.string().optional(),
    description: z.string().optional(),
    marketCategory: z.string().optional(),
  }).optional(),
});

const singleBetSchema = z.object({
  gameId: z.string(),
  betType: z.string(),
  selection: z.string(),
  odds: z.number(),
  line: z.number().nullable().optional(),
  stake: z.number().positive(),
  potentialPayout: z.number().positive(),
  playerProp: z.object({
    playerId: z.string(),
    playerName: z.string(),
    statType: z.string(),
    category: z.string(),
  }).optional(),
  gameProp: z.object({
    propType: z.string(),
    description: z.string(),
    marketCategory: z.string(),
  }).optional(),
});

const parlayBetSchema = z.object({
  legs: z.array(betLegSchema).min(2, "Parlay must have at least 2 legs"),
  stake: z.number().positive(),
  potentialPayout: z.number().positive(),
  odds: z.number(),
});

const teaserBetSchema = z.object({
  legs: z.array(betLegSchema).min(2, "Teaser must have at least 2 legs"),
  stake: z.number().positive(),
  potentialPayout: z.number().positive(),
  odds: z.number(),
  teaserType: z.enum([
    "2T_TEASER",
    "3T_SUPER_TEASER", 
    "3T_TEASER",
    "4T_MONSTER_TEASER",
    "4T_TEASER",
    "5T_TEASER",
    "6T_TEASER",
    "7T_TEASER",
    "8T_TEASER"
  ]),
  teaserMetadata: z.object({
    adjustedLines: z.record(z.number()),
    originalLines: z.record(z.number()),
    pointAdjustment: z.number(),
    pushRule: z.enum(["push", "lose", "revert"]),
  }),
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

    const { gameId, betType, selection, odds, line, stake, potentialPayout, playerProp, gameProp } = validatedData.data;
    
    console.log("[placeSingleBetAction] Validated data:", { gameId, betType, selection, odds, line, stake, potentialPayout, playerProp, gameProp });
    
    // Ensure odds is an integer as required by Prisma schema
    const oddsInt = Math.round(odds);

    // Verify game exists in database, if not try to fetch and create it
    let game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, status: true },
    });

    if (!game) {
      console.log("[placeSingleBetAction] Game not in database, fetching from API:", gameId);
      
      // Try to fetch the game from the live API and persist it
      const { fetchGameFromAPI, ensureGameExists } = await import("@/lib/gameHelpers");
      const gameData = await fetchGameFromAPI(gameId);
      
      if (!gameData) {
        console.error("[placeSingleBetAction] Game not found in API:", gameId);
        return {
          success: false,
          error: "Game not found. Please refresh the page and try again.",
        };
      }
      
      // Persist the game to the database
      await ensureGameExists(gameData);
      
      // Fetch again to get the game record
      game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, status: true },
      });
      
      if (!game) {
        console.error("[placeSingleBetAction] Failed to create game:", gameId);
        return {
          success: false,
          error: "Failed to process game data. Please try again.",
        };
      }
    }

    if (game.status === "finished") {
      console.error("[placeSingleBetAction] Game already finished:", gameId);
      return {
        success: false,
        error: "Cannot place bet on finished game",
      };
    }

    console.log("[placeSingleBetAction] Creating bet in database...");

    // Check if user has sufficient balance (create account if doesn't exist)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      console.warn("[placeSingleBetAction] Account not found, creating new account for user:", session.user.id);
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      console.log("[placeSingleBetAction] Account created with balance:", account.balance);
    }

    if (account.balance < stake) {
      console.error("[placeSingleBetAction] Insufficient balance:", { balance: account.balance, stake });
      return {
        success: false,
        error: `Insufficient balance. Available: $${account.balance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Create bet and deduct stake from account balance in a transaction
    const [createdBet] = await prisma.$transaction([
      prisma.bet.create({
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
          // Store player/game prop metadata in legs JSON field for single bets
          legs: (playerProp || gameProp) ? {
            playerProp: playerProp || undefined,
            gameProp: gameProp || undefined,
          } : undefined,
        },
      }),
      prisma.account.update({
        where: { userId: session.user.id },
        data: {
          balance: {
            decrement: stake,
          },
        },
      }),
    ]);

    console.log("[placeSingleBetAction] Bet created successfully:", createdBet.id);
    console.log("[placeSingleBetAction] Balance deducted:", stake);

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

    // Ensure all games in the parlay exist in the database
    const { fetchGameFromAPI, ensureGameExists } = await import("@/lib/gameHelpers");
    
    for (const leg of legs) {
      if (!leg.gameId) continue;
      
      let game = await prisma.game.findUnique({
        where: { id: leg.gameId },
        select: { id: true, status: true },
      });
      
      if (!game) {
        console.log("[placeParlayBetAction] Game not in database, fetching from API:", leg.gameId);
        
        const gameData = await fetchGameFromAPI(leg.gameId);
        
        if (!gameData) {
          console.error("[placeParlayBetAction] Game not found in API:", leg.gameId);
          return {
            success: false,
            error: `Game not found: ${leg.gameId}. Please refresh and try again.`,
          };
        }
        
        await ensureGameExists(gameData);
        
        game = await prisma.game.findUnique({
          where: { id: leg.gameId },
          select: { id: true, status: true },
        });
      }
      
      if (game?.status === "finished") {
        console.error("[placeParlayBetAction] Game already finished:", leg.gameId);
        return {
          success: false,
          error: "Cannot place bet on finished game",
        };
      }
    }

    console.log("[placeParlayBetAction] Creating parlay bet in database...");

    // Check if user has sufficient balance (create account if doesn't exist)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      console.warn("[placeParlayBetAction] Account not found, creating new account for user:", session.user.id);
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      console.log("[placeParlayBetAction] Account created with balance:", account.balance);
    }

    if (account.balance < stake) {
      console.error("[placeParlayBetAction] Insufficient balance:", { balance: account.balance, stake });
      return {
        success: false,
        error: `Insufficient balance. Available: $${account.balance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Create parlay bet and deduct stake from account balance in a transaction
    const [createdBet] = await prisma.$transaction([
      prisma.bet.create({
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
      }),
      prisma.account.update({
        where: { userId: session.user.id },
        data: {
          balance: {
            decrement: stake,
          },
        },
      }),
    ]);

    console.log("[placeParlayBetAction] Parlay bet created successfully:", createdBet.id);
    console.log("[placeParlayBetAction] Balance deducted:", stake);

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
 * Place Teaser Bet Server Action
 * 
 * Creates a teaser bet with multiple legs and adjusted lines for the authenticated user.
 * Automatically revalidates the bet history cache.
 */
export async function placeTeaserBetAction(
  teaserData: z.infer<typeof teaserBetSchema>
): Promise<PlaceBetsState> {
  try {
    console.log("[placeTeaserBetAction] Received teaser data:", JSON.stringify(teaserData, null, 2));
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[placeTeaserBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    console.log("[placeTeaserBetAction] User authenticated:", session.user.id);

    // Validate input
    const validatedData = teaserBetSchema.safeParse(teaserData);
    if (!validatedData.success) {
      console.error("[placeTeaserBetAction] Validation failed:", validatedData.error.errors);
      return {
        success: false,
        error: `Invalid teaser data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { legs, stake, potentialPayout, odds, teaserType, teaserMetadata } = validatedData.data;

    console.log("[placeTeaserBetAction] Validated data:", { 
      legs: legs.length, 
      stake, 
      potentialPayout, 
      odds, 
      teaserType,
      pushRule: teaserMetadata.pushRule 
    });

    // Ensure odds is an integer as required by Prisma schema
    const oddsInt = Math.round(odds);

    // Ensure all games in the teaser exist in the database
    const { fetchGameFromAPI, ensureGameExists } = await import("@/lib/gameHelpers");
    
    for (const leg of legs) {
      if (!leg.gameId) continue;
      
      let game = await prisma.game.findUnique({
        where: { id: leg.gameId },
        select: { id: true, status: true },
      });
      
      if (!game) {
        console.log("[placeTeaserBetAction] Game not in database, fetching from API:", leg.gameId);
        
        const gameData = await fetchGameFromAPI(leg.gameId);
        
        if (!gameData) {
          console.error("[placeTeaserBetAction] Game not found in API:", leg.gameId);
          return {
            success: false,
            error: `Game not found: ${leg.gameId}. Please refresh and try again.`,
          };
        }
        
        await ensureGameExists(gameData);
        
        game = await prisma.game.findUnique({
          where: { id: leg.gameId },
          select: { id: true, status: true },
        });
      }
      
      if (game?.status === "finished") {
        console.error("[placeTeaserBetAction] Game already finished:", leg.gameId);
        return {
          success: false,
          error: "Cannot place bet on finished game",
        };
      }
    }

    console.log("[placeTeaserBetAction] Creating teaser bet in database...");

    // Check if user has sufficient balance (create account if doesn't exist)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      console.warn("[placeTeaserBetAction] Account not found, creating new account for user:", session.user.id);
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      console.log("[placeTeaserBetAction] Account created with balance:", account.balance);
    }

    if (account.balance < stake) {
      console.error("[placeTeaserBetAction] Insufficient balance:", { balance: account.balance, stake });
      return {
        success: false,
        error: `Insufficient balance. Available: $${account.balance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Generate idempotency key for teaser bet
    const idempotencyKey = `teaser-${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create teaser bet and deduct stake from account balance in a transaction
    const [createdBet] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          betType: "teaser",
          stake,
          potentialPayout,
          status: "pending",
          placedAt: new Date(),
          userId: session.user.id,
          selection: `${teaserType} (${legs.length} legs)`,
          odds: oddsInt,
          line: null,
          gameId: null,
          legs: legs,
          teaserType: teaserType,
          teaserMetadata: teaserMetadata,
          idempotencyKey,
        },
      }),
      prisma.account.update({
        where: { userId: session.user.id },
        data: {
          balance: {
            decrement: stake,
          },
        },
      }),
    ]);

    console.log("[placeTeaserBetAction] Teaser bet created successfully:", createdBet.id);
    console.log("[placeTeaserBetAction] Balance deducted:", stake);

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: `Teaser bet placed successfully! (${legs.length} legs)`,
      betIds: [createdBet.id],
    };
  } catch (error) {
    console.error("[placeTeaserBetAction] Error:", error);
    console.error("[placeTeaserBetAction] Teaser data:", JSON.stringify(teaserData, null, 2));
    return {
      success: false,
      error: `Failed to place teaser bet: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Settle Bet Server Action
 * 
 * Updates bet status (won/lost/push) and processes payouts for winning bets.
 * Supports teaser-specific push rules (push/lose/revert).
 * This would typically be called by an admin/cron job after games finish.
 */
export async function settleBetAction(
  betId: string,
  status: "won" | "lost" | "push",
  legResults?: { [legId: string]: "won" | "lost" | "push" }
): Promise<PlaceBetsState> {
  try {
    console.log("[settleBetAction] Settling bet:", betId, "Status:", status, "Leg results:", legResults);

    // Get authenticated user (in production, check admin role)
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to settle bets",
      };
    }

    // Get bet details with teaser metadata
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      select: {
        id: true,
        userId: true,
        betType: true,
        status: true,
        potentialPayout: true,
        stake: true,
        teaserType: true,
        teaserMetadata: true,
        legs: true,
      },
    });

    if (!bet) {
      return {
        success: false,
        error: "Bet not found",
      };
    }

    if (bet.status !== "pending") {
      return {
        success: false,
        error: `Bet already settled with status: ${bet.status}`,
      };
    }

    let finalStatus = status;
    let payoutAmount = 0;

    // Special handling for teaser bets with push rules
    if (bet.betType === "teaser" && bet.teaserType && legResults) {
      const metadata = bet.teaserMetadata as { pushRule: "push" | "lose" | "revert" } | null;
      const pushRule = metadata?.pushRule || "push";
      const legStatuses = Object.values(legResults);
      
      const hasLoss = legStatuses.some(s => s === "lost");
      const hasPush = legStatuses.some(s => s === "push");
      const allWins = legStatuses.every(s => s === "won");

      console.log("[settleBetAction] Teaser evaluation:", { 
        teaserType: bet.teaserType, 
        pushRule, 
        hasLoss, 
        hasPush, 
        allWins,
        legCount: legStatuses.length 
      });

      if (hasLoss) {
        // Any loss = entire teaser loses
        finalStatus = "lost";
        payoutAmount = 0;
        console.log("[settleBetAction] Teaser lost - has losing leg");
      } else if (allWins) {
        // All wins = teaser wins
        finalStatus = "won";
        payoutAmount = bet.potentialPayout;
        console.log("[settleBetAction] Teaser won - all legs won");
      } else if (hasPush) {
        // Has push(es), apply push rule
        console.log("[settleBetAction] Applying push rule:", pushRule);
        
        switch (pushRule) {
          case "push":
            // Entire teaser pushes, return stake
            finalStatus = "push";
            payoutAmount = bet.stake;
            console.log("[settleBetAction] Push rule: push - returning stake");
            break;
            
          case "lose":
            // Entire teaser loses
            finalStatus = "lost";
            payoutAmount = 0;
            console.log("[settleBetAction] Push rule: lose - bet marked as lost");
            break;
            
          case "revert":
            // Revert to lower teaser (e.g., 3T → 2T)
            const { getTeaserConfig } = await import("@/types/teaser");
            const remainingLegs = legStatuses.filter(s => s === "won").length;
            
            console.log("[settleBetAction] Attempting to revert teaser:", {
              originalType: bet.teaserType,
              remainingLegs
            });
            
            // Find teaser config for remaining legs
            const revertedType = `${remainingLegs}T_TEASER`;
            
            try {
              const revertedConfig = getTeaserConfig(revertedType as import("@/types/teaser").TeaserType);
              
              if (revertedConfig && remainingLegs >= revertedConfig.minLegs) {
                // Calculate new payout with reverted odds
                const revertedPayout = bet.stake * (
                  revertedConfig.odds > 0 
                    ? (revertedConfig.odds / 100) + 1 
                    : (100 / Math.abs(revertedConfig.odds)) + 1
                );
                finalStatus = "won";
                payoutAmount = revertedPayout;
                console.log("[settleBetAction] Reverted to:", revertedType, "Payout:", revertedPayout);
              } else {
                // Not enough legs to revert, return stake
                finalStatus = "push";
                payoutAmount = bet.stake;
                console.log("[settleBetAction] Cannot revert - not enough legs, returning stake");
              }
            } catch (error) {
              // If reversion fails, return stake
              console.warn("[settleBetAction] Reversion failed, returning stake:", error);
              finalStatus = "push";
              payoutAmount = bet.stake;
            }
            break;
        }
      }
    } else {
      // Standard single/parlay settlement
      if (finalStatus === "won") {
        payoutAmount = bet.potentialPayout;
      } else if (finalStatus === "push") {
        payoutAmount = bet.stake;
      }
      console.log("[settleBetAction] Standard bet settlement:", { finalStatus, payoutAmount });
    }

    // Update bet status and add payout to account balance in a transaction
    if (payoutAmount > 0) {
      await prisma.$transaction([
        prisma.bet.update({
          where: { id: betId },
          data: {
            status: finalStatus,
            settledAt: new Date(),
          },
        }),
        prisma.account.update({
          where: { userId: bet.userId },
          data: {
            balance: {
              increment: payoutAmount,
            },
          },
        }),
      ]);

      console.log("[settleBetAction] Bet settled, payout added:", payoutAmount);
    } else {
      // Just update bet status for lost bets
      await prisma.bet.update({
        where: { id: betId },
        data: {
          status: finalStatus,
          settledAt: new Date(),
        },
      });

      console.log("[settleBetAction] Bet settled as lost, no payout");
    }

    // Revalidate caches
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: `Bet settled as ${finalStatus}${payoutAmount > 0 ? ` with payout $${payoutAmount.toFixed(2)}` : ''}`,
      betIds: [betId],
    };
  } catch (error) {
    console.error("[settleBetAction] Error:", error);
    return {
      success: false,
      error: `Failed to settle bet: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
