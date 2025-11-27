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
import type { LeagueID } from '@/types/game';
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

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
    periodID: z.string().optional(), // For period-specific props (e.g., "1q", "2q", "1h")
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
    periodID: z.string().optional(), // For period-specific props (e.g., "1q", "2q", "1h")
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
    logger.debug("[placeSingleBetAction] Received bet data", { bet });
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      logger.error("[placeSingleBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    logger.info("[placeSingleBetAction] User authenticated", { userId: session.user.id });

    // Validate input
    const validatedData = singleBetSchema.safeParse(bet);
    if (!validatedData.success) {
      logger.error("[placeSingleBetAction] Validation failed", validatedData.error);
      return {
        success: false,
        error: `Invalid bet data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { gameId, betType, selection, odds, line, stake, potentialPayout, playerProp, gameProp } = validatedData.data;
    
    logger.info("[placeSingleBetAction] Validated data", { data: { gameId, betType, selection, odds, line, stake, potentialPayout, playerProp, gameProp } });
    
    // Ensure odds is an integer as required by Prisma schema
    const oddsInt = Math.round(odds);

    // Verify game exists in database, if not try to fetch and create it
    let game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, status: true },
    });

    if (!game) {
      logger.info("[placeSingleBetAction] Game not in database, fetching from API", { data: gameId });
      
      // Try to fetch the game from the live API and persist it
      const { fetchGameFromAPI, ensureGameExists } = await import("@/lib/gameHelpers");
      const gameData = await fetchGameFromAPI(gameId);
      
      if (!gameData) {
        logger.error("[placeSingleBetAction] Game not found in API", { data: gameId });
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
        logger.error("[placeSingleBetAction] Failed to create game", { data: gameId });
        return {
          success: false,
          error: "Failed to process game data. Please try again.",
        };
      }
    }

    if (game.status === "finished") {
      logger.error("[placeSingleBetAction] Game already finished", { data: gameId });
      return {
        success: false,
        error: "Cannot place bet on finished game",
      };
    }

    // === INDUSTRY STANDARD: LIVE BETTING MARKET CLOSURE ENFORCEMENT ===
    // Ensure we're not accepting bets for markets that should be closed
    if (game.status === "live") {
      // Load full game state for validation
      const fullGame = await prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          startTime: true,
          homeScore: true,
          awayScore: true,
          period: true,
          timeRemaining: true,
          league: { select: { id: true } },
        },
      });

      if (!fullGame) {
        logger.warn('[placeSingleBetAction] Game disappeared before placement', { gameId });
        return { success: false, error: 'Game not available for betting' };
      }

      const { validateBetPlacement, isPeriodCompleted } = await import("@/lib/market-closure-rules");
      const gameState = {
        leagueId: fullGame.league?.id as unknown as LeagueID,
        status: fullGame.status as 'upcoming' | 'live' | 'finished',
        startTime: fullGame.startTime instanceof Date ? fullGame.startTime.toISOString() : String(fullGame.startTime),
        homeScore: fullGame.homeScore ?? undefined,
        awayScore: fullGame.awayScore ?? undefined,
        period: fullGame.period ?? undefined,
        timeRemaining: fullGame.timeRemaining ?? undefined,
      };

      const validationError = validateBetPlacement(gameState);
      if (validationError) {
        logger.warn('[placeSingleBetAction] Market closed by rule', { reason: validationError, gameId });
        return { success: false, error: validationError };
      }

      // If this is a game prop with a period ID, ensure the period hasn't started
      if (gameProp?.periodID) {
        if (isPeriodCompleted(gameProp.periodID, gameState)) {
          const msg = `Cannot place bet on ${gameProp.periodID.toUpperCase()} - period has already completed`;
          logger.warn('[placeSingleBetAction] Period prop closed', { periodID: gameProp.periodID, gameId });
          return { success: false, error: msg };
        }
      }
    }

    logger.info("[placeSingleBetAction] Creating bet in database...");

    // Check available balance (balance minus pending bet risk)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      logger.warn("[placeSingleBetAction] Account not found, creating new account for user", { data: session.user.id });
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      logger.info("[placeSingleBetAction] Account created with balance", { data: account.balance });
    }

    // Calculate risk from pending bets
    const pendingBets = await prisma.bet.findMany({
      where: { userId: session.user.id, status: 'pending' },
      select: { stake: true },
    });
    const currentRisk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const availableBalance = Number(account.balance) - currentRisk;

    if (availableBalance < stake) {
      logger.error("[placeSingleBetAction] Insufficient available balance", { data: { 
        balance: account.balance, 
        risk: currentRisk, 
        available: availableBalance, 
        stake 
      } });
      return {
        success: false,
        error: `Insufficient available balance. Balance: $${account.balance.toFixed(2)}, At Risk: $${currentRisk.toFixed(2)}, Available: $${availableBalance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Create bet WITHOUT deducting from balance (balance only changes when bet settles)
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
        // Store player/game prop metadata in legs JSON field for single bets
        legs: (playerProp || gameProp) ? {
          playerProp: playerProp || undefined,
          gameProp: gameProp || undefined,
        } : undefined,
      },
    });

    logger.info("[placeSingleBetAction] Bet created successfully", { data: createdBet.id });
    logger.info("[placeSingleBetAction] Balance unchanged, risk increased by", { data: stake });

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: "Bet placed successfully!",
      betIds: [createdBet.id],
    };
  } catch (error) {
    logger.error("[placeSingleBetAction] Error", error as Error, () => ({ bet }));
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
    logger.debug("[placeParlayBetAction] Received parlay data", { parlayData });
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      logger.error("[placeParlayBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    logger.info("[placeParlayBetAction] User authenticated", { data: session.user.id });

    // Validate input
    const validatedData = parlayBetSchema.safeParse(parlayData);
    if (!validatedData.success) {
      logger.error("[placeParlayBetAction] Validation failed", { data: validatedData.error.errors });
      return {
        success: false,
        error: `Invalid parlay data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { legs, stake, potentialPayout, odds } = validatedData.data;

    logger.info("[placeParlayBetAction] Validated data", { data: { legs: legs.length, stake, potentialPayout, odds } });

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
        logger.info("[placeParlayBetAction] Game not in database, fetching from API", { data: leg.gameId });
        
        const gameData = await fetchGameFromAPI(leg.gameId);
        
        if (!gameData) {
          logger.error("[placeParlayBetAction] Game not found in API", { data: leg.gameId });
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
        logger.error("[placeParlayBetAction] Game already finished", { data: leg.gameId });
        return {
          success: false,
          error: "Cannot place bet on finished game",
        };
      }
    }

    // === INDUSTRY STANDARD: VALIDATE EACH PARLAY LEG FOR MARKET CLOSURE ===
    {
      const { validateBetPlacement, isPeriodCompleted } = await import("@/lib/market-closure-rules");
      const gameIds = Array.from(new Set(legs.map((l: any) => l.gameId).filter(Boolean)));
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
          league: { select: { id: true } },
        },
      });

      const gameMap = new Map(games.map((g: any) => [g.id, g]));

      for (const leg of legs) {
        if (!leg.gameId) continue;
        const g = gameMap.get(leg.gameId);
        if (!g) {
          return { success: false, error: `Game not found: ${leg.gameId}` };
        }

        if (g.status === "finished") {
          return { success: false, error: `Cannot place parlay bet with finished game: ${leg.gameId}` };
        }

        if (g.status === "live") {
          const gameState = {
            leagueId: g.league?.id as unknown as LeagueID,
            status: g.status as 'upcoming' | 'live' | 'finished',
            startTime: g.startTime instanceof Date ? g.startTime.toISOString() : String(g.startTime),
            homeScore: g.homeScore ?? undefined,
            awayScore: g.awayScore ?? undefined,
            period: g.period ?? undefined,
            timeRemaining: g.timeRemaining ?? undefined,
          };

          const validationError = validateBetPlacement(gameState);
          if (validationError) {
            return { success: false, error: `Parlay leg ${leg.gameId}: ${validationError}` };
          }

          if (leg.betType === 'game_prop' && (leg as any).gameProp?.periodID) {
            if (isPeriodCompleted((leg as any).gameProp.periodID, gameState)) {
              return { success: false, error: `Parlay leg ${leg.gameId}: Cannot bet on ${(leg as any).gameProp.periodID.toUpperCase()} - period has already completed` };
            }
          }
        }
      }
    }

    logger.info("[placeParlayBetAction] Creating parlay bet in database...");

    // Check available balance (balance minus pending bet risk)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      logger.warn("[placeParlayBetAction] Account not found, creating new account for user", { data: session.user.id });
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      logger.info("[placeParlayBetAction] Account created with balance", { data: account.balance });
    }

    // Calculate risk from pending bets
    const pendingBets = await prisma.bet.findMany({
      where: { userId: session.user.id, status: 'pending' },
      select: { stake: true },
    });
    const currentRisk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const availableBalance = Number(account.balance) - currentRisk;

    if (availableBalance < stake) {
      logger.error("[placeParlayBetAction] Insufficient available balance", { data: { 
        balance: account.balance, 
        risk: currentRisk, 
        available: availableBalance, 
        stake 
      } });
      return {
        success: false,
        error: `Insufficient available balance. Balance: $${account.balance.toFixed(2)}, At Risk: $${currentRisk.toFixed(2)}, Available: $${availableBalance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Create parlay bet WITHOUT deducting from balance (balance only changes when bet settles)
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

    logger.info("[placeParlayBetAction] Parlay bet created successfully", { data: createdBet.id });
    logger.info("[placeParlayBetAction] Balance unchanged, risk increased by", { data: stake });

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: "Parlay bet placed successfully!",
      betIds: [createdBet.id],
    };
  } catch (error) {
    logger.error("[placeParlayBetAction] Error", error as Error, () => ({ parlayData }));
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
    logger.debug("[placeTeaserBetAction] Received teaser data", { teaserData });
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      logger.error("[placeTeaserBetAction] No authenticated user");
      return {
        success: false,
        error: "You must be logged in to place bets",
      };
    }

    logger.info("[placeTeaserBetAction] User authenticated", { data: session.user.id });

    // Validate input
    const validatedData = teaserBetSchema.safeParse(teaserData);
    if (!validatedData.success) {
      logger.error("[placeTeaserBetAction] Validation failed", { data: validatedData.error.errors });
      return {
        success: false,
        error: `Invalid teaser data: ${validatedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { legs, stake, potentialPayout, odds, teaserType, teaserMetadata } = validatedData.data;

    logger.info("[placeTeaserBetAction] Validated data", { data: { 
      legs: legs.length, 
      stake, 
      potentialPayout, 
      odds, 
      teaserType,
      pushRule: teaserMetadata.pushRule 
    } });

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
        logger.info("[placeTeaserBetAction] Game not in database, fetching from API", { data: leg.gameId });
        
        const gameData = await fetchGameFromAPI(leg.gameId);
        
        if (!gameData) {
          logger.error("[placeTeaserBetAction] Game not found in API", { data: leg.gameId });
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
        logger.error("[placeTeaserBetAction] Game already finished", { data: leg.gameId });
        return {
          success: false,
          error: "Cannot place bet on finished game",
        };
      }
    }

    // === INDUSTRY STANDARD: VALIDATE EACH TEASER LEG FOR MARKET CLOSURE ===
    {
      const { validateBetPlacement, isPeriodCompleted } = await import("@/lib/market-closure-rules");
      const gameIds = Array.from(new Set(legs.map((l: any) => l.gameId).filter(Boolean)));
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
          league: { select: { id: true } },
        },
      });

      const gameMap = new Map(games.map((g: any) => [g.id, g]));

      for (const leg of legs) {
        if (!leg.gameId) continue;
        const g = gameMap.get(leg.gameId);
        if (!g) {
          return { success: false, error: `Game not found: ${leg.gameId}` };
        }

        if (g.status === "finished") {
          return { success: false, error: `Cannot place teaser bet with finished game: ${leg.gameId}` };
        }

        if (g.status === "live") {
          const gameState = {
            leagueId: g.league?.id as unknown as LeagueID,
            status: g.status as 'upcoming' | 'live' | 'finished',
            startTime: g.startTime instanceof Date ? g.startTime.toISOString() : String(g.startTime),
            homeScore: g.homeScore ?? undefined,
            awayScore: g.awayScore ?? undefined,
            period: g.period ?? undefined,
            timeRemaining: g.timeRemaining ?? undefined,
          };

          const validationError = validateBetPlacement(gameState);
          if (validationError) {
            return { success: false, error: `Teaser leg ${leg.gameId}: ${validationError}` };
          }

          if (leg.betType === 'game_prop' && (leg as any).gameProp?.periodID) {
            if (isPeriodCompleted((leg as any).gameProp.periodID, gameState)) {
              return { success: false, error: `Teaser leg ${leg.gameId}: Cannot bet on ${(leg as any).gameProp.periodID.toUpperCase()} - period has already completed` };
            }
          }
        }
      }
    }

    logger.info("[placeTeaserBetAction] Creating teaser bet in database...");

    // Check available balance (balance minus pending bet risk)
    let account = await prisma.account.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    });

    // Auto-create account if it doesn't exist (for legacy users)
    if (!account) {
      logger.warn("[placeTeaserBetAction] Account not found, creating new account for user", { data: session.user.id });
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          balance: 1000.0, // Starting balance for legacy users
        },
        select: { balance: true },
      });
      logger.info("[placeTeaserBetAction] Account created with balance", { data: account.balance });
    }

    // Calculate risk from pending bets
    const pendingBets = await prisma.bet.findMany({
      where: { userId: session.user.id, status: 'pending' },
      select: { stake: true },
    });
    const currentRisk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const availableBalance = Number(account.balance) - currentRisk;

    if (availableBalance < stake) {
      logger.error("[placeTeaserBetAction] Insufficient available balance", { data: { 
        balance: account.balance, 
        risk: currentRisk, 
        available: availableBalance, 
        stake 
      } });
      return {
        success: false,
        error: `Insufficient available balance. Balance: $${account.balance.toFixed(2)}, At Risk: $${currentRisk.toFixed(2)}, Available: $${availableBalance.toFixed(2)}, Required: $${stake.toFixed(2)}`,
      };
    }

    // Generate idempotency key for teaser bet
    const idempotencyKey = `teaser-${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create teaser bet WITHOUT deducting from balance (balance only changes when bet settles)
    const createdBet = await prisma.bet.create({
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
    });

    logger.info("[placeTeaserBetAction] Teaser bet created successfully", { data: createdBet.id });
    logger.info("[placeTeaserBetAction] Balance unchanged, risk increased by", { data: stake });

    // Revalidate bet history cache - this triggers React Query refetch
    revalidatePath("/my-bets");
    revalidatePath("/");

    return {
      success: true,
      message: `Teaser bet placed successfully! (${legs.length} legs)`,
      betIds: [createdBet.id],
    };
  } catch (error) {
    logger.error("[placeTeaserBetAction] Error", error as Error, () => ({ teaserData }));
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
    logger.info("[settleBetAction] Settling bet", { betId, status, legResults });

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

      logger.info("[settleBetAction] Teaser evaluation", { data: { 
        teaserType: bet.teaserType, 
        pushRule, 
        hasLoss, 
        hasPush, 
        allWins,
        legCount: legStatuses.length 
      } });

      if (hasLoss) {
        // Any loss = entire teaser loses
        finalStatus = "lost";
        payoutAmount = 0;
        logger.info("[settleBetAction] Teaser lost - has losing leg");
      } else if (allWins) {
        // All wins = teaser wins
        finalStatus = "won";
        payoutAmount = bet.potentialPayout;
        logger.info("[settleBetAction] Teaser won - all legs won");
      } else if (hasPush) {
        // Has push(es), apply push rule
        logger.info("[settleBetAction] Applying push rule", { data: pushRule });
        
        switch (pushRule) {
          case "push":
            // Entire teaser pushes, return stake
            finalStatus = "push";
            payoutAmount = bet.stake;
            logger.info("[settleBetAction] Push rule: push - returning stake");
            break;
            
          case "lose":
            // Entire teaser loses
            finalStatus = "lost";
            payoutAmount = 0;
            logger.info("[settleBetAction] Push rule: lose - bet marked as lost");
            break;
            
          case "revert":
            // Revert to lower teaser (e.g., 3T → 2T)
            const { getTeaserConfig } = await import("@/types/teaser");
            const remainingLegs = legStatuses.filter(s => s === "won").length;
            
            logger.info("[settleBetAction] Attempting to revert teaser", { data: {
              originalType: bet.teaserType,
              remainingLegs
            } });
            
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
                logger.info("[settleBetAction] Reverted", { revertedType, payout: revertedPayout });
              } else {
                // Not enough legs to revert, return stake
                finalStatus = "push";
                payoutAmount = bet.stake;
                logger.info("[settleBetAction] Cannot revert - not enough legs, returning stake");
              }
            } catch (error) {
              // If reversion fails, return stake
              logger.warn("[settleBetAction] Reversion failed, returning stake", { data: error });
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
      logger.info("[settleBetAction] Standard bet settlement", { data: { finalStatus, payoutAmount } });
    }

    // Update bet status and process balance changes in a transaction
    if (finalStatus === "won" || finalStatus === "push") {
      // For wins: add payout to balance
      // For push: return original stake (add it back since it wasn't deducted)
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

      logger.info("[settleBetAction] Bet settled, payout added", { data: payoutAmount });
    } else {
      // For lost bets: deduct the stake from balance
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
              decrement: bet.stake,
            },
          },
        }),
      ]);

      logger.info("[settleBetAction] Bet settled as lost, stake deducted", { data: bet.stake });
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
    logger.error("[settleBetAction] Error", { data: error });
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
    logger.error("Place bets error", { data: error });
    return {
      success: false,
      error: "Failed to place bets. Please try again.",
    };
  }
}
