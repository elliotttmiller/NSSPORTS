/* eslint-disable */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import prisma from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ApiErrors, withErrorHandling, successResponse } from "@/lib/apiResponse";
import { BetsResponseSchema, BetRequestSchema, ParlayBetRequestSchema, SingleBetRequestSchema, SingleBetResponseSchema, ParlayBetResponseSchema } from "@/lib/schemas/bets";
import { getAuthUser } from "@/lib/authHelpers";
import { batchFetchPlayerStats, type PlayerGameStats } from "@/lib/player-stats";
import { getPeriodScore } from "@/lib/period-scores";

// Minimal leg shape stored in Bet.legs JSON
type ParlayLeg = {
  gameId?: string;
  betType?: string;
  selection?: string;
  odds?: number;
  line?: number | null;
  // Player prop metadata for parlay legs
  playerProp?: {
    playerId?: string;
    playerName?: string;
    statType?: string;
    category?: string;
  };
  // Game prop metadata for parlay legs
  gameProp?: {
    propType?: string;
    description?: string;
    marketCategory?: string;
  };
};

function toLegArray(input: unknown): ParlayLeg[] | null {
  try {
    const value =
      typeof input === "string" ? (JSON.parse(input) as unknown) : input;
    if (!Array.isArray(value)) return null;
    const parsed = value
      .map((item) => (typeof item === "object" && item !== null ? item : null))
      .filter((x): x is Record<string, unknown> => x !== null)
      .map((obj) => ({
        gameId: typeof obj.gameId === "string" ? obj.gameId : undefined,
        betType: typeof obj.betType === "string" ? obj.betType : undefined,
        selection:
          typeof obj.selection === "string" ? obj.selection : undefined,
        odds:
          typeof obj.odds === "number"
            ? obj.odds
            : typeof obj.odds === "string"
            ? Number(obj.odds)
            : undefined,
        line:
          typeof obj.line === "number"
            ? obj.line
            : typeof obj.line === "string"
            ? Number(obj.line)
            : null,
        // Parse player prop metadata
        playerProp: obj.playerProp && typeof obj.playerProp === 'object' ? {
          playerId: typeof (obj.playerProp as any).playerId === 'string' ? (obj.playerProp as any).playerId : undefined,
          playerName: typeof (obj.playerProp as any).playerName === 'string' ? (obj.playerProp as any).playerName : undefined,
          statType: typeof (obj.playerProp as any).statType === 'string' ? (obj.playerProp as any).statType : undefined,
          category: typeof (obj.playerProp as any).category === 'string' ? (obj.playerProp as any).category : undefined,
        } : undefined,
        // Parse game prop metadata
        gameProp: obj.gameProp && typeof obj.gameProp === 'object' ? {
          propType: typeof (obj.gameProp as any).propType === 'string' ? (obj.gameProp as any).propType : undefined,
          description: typeof (obj.gameProp as any).description === 'string' ? (obj.gameProp as any).description : undefined,
          marketCategory: typeof (obj.gameProp as any).marketCategory === 'string' ? (obj.gameProp as any).marketCategory : undefined,
          periodID: typeof (obj.gameProp as any).periodID === 'string' ? (obj.gameProp as any).periodID : undefined,
        } : undefined,
      }));
    // Parsing succeeded; return parsed legs
    return parsed;
  } catch (e) {
    // Parsing failed - return null to indicate no legs
    return null;
  }
}

export async function GET() {
  return withErrorHandling(async () => {
    logger.info('Fetching bet history');

    const userId = await getAuthUser();

    // Fetch bets for the authenticated user
    const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    select: {
      id: true,
      betType: true,
      selection: true,
      odds: true,
      line: true,
      stake: true,
      potentialPayout: true,
      status: true,
      placedAt: true,
      settledAt: true,
      actualResult: true, // Explicitly select actualResult
      legs: true,
      teaserType: true,
      teaserMetadata: true,
      game: {
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      },
    },
  });
    
    logger.debug('Bets fetched', { count: bets.length });
    
    // Normalize legs for parlay bets and advanced bet types, enrich leg.game when possible
    const allLegGameIds: Set<string> = new Set();
    for (const bet of bets) {
      // Handle parlay and teaser bets
      if ((bet.betType === "parlay" || bet.betType === "teaser") && bet.legs) {
        const legs = toLegArray(bet.legs);
        logger.debug('[my-bets] Parlay/Teaser bet legs:', { betId: bet.id, betType: bet.betType, legsRaw: bet.legs, legsParsed: legs });
        if (Array.isArray(legs)) {
          for (const leg of legs) {
            logger.debug('[my-bets] Leg:', { gameId: leg?.gameId, betType: leg?.betType, selection: leg?.selection });
            if (leg?.gameId) allLegGameIds.add(leg.gameId);
          }
        }
      }
      
      // Handle advanced bet types (round_robin, if_bet, reverse, bet_it_all)
      if (["round_robin", "if_bet", "reverse", "bet_it_all"].includes(bet.betType) && bet.legs) {
        try {
          const metadata = typeof bet.legs === "string" ? JSON.parse(bet.legs) : bet.legs;
          
          // Extract game IDs from selections
          if (metadata.selections && Array.isArray(metadata.selections)) {
            for (const selection of metadata.selections) {
              if (selection?.gameId) allLegGameIds.add(selection.gameId);
            }
          }
          
          // For if_bet and bet_it_all, extract from legs array
          if (metadata.legs && Array.isArray(metadata.legs)) {
            for (const leg of metadata.legs) {
              if (leg?.gameId) allLegGameIds.add(leg.gameId);
            }
          }
        } catch (e) {
          logger.error('[my-bets] Error parsing advanced bet metadata:', { betId: bet.id, error: e });
        }
      }
    }
    logger.debug('[my-bets] All leg game IDs to fetch:', { gameIds: Array.from(allLegGameIds) });

    let legGamesById: Record<string, unknown> = {};
    if (allLegGameIds.size > 0) {
      logger.debug('[my-bets] Fetching games for legs...', { count: allLegGameIds.size });
      const games = await prisma.game.findMany({
        where: { id: { in: Array.from(allLegGameIds) } },
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });
  logger.debug('[my-bets] Games fetched:', { count: games.length, gameIds: games.map((g: any) => g.id) });
      legGamesById = Object.fromEntries(
        games.map((g: any) => [g.id, JSON.parse(JSON.stringify(g))])
      );
      logger.debug('[my-bets] legGamesById keys:', { keys: Object.keys(legGamesById) });
    }

    // Helper: compute human-friendly selection label to match BetCard
    const computeSelectionLabel = (
      betType: string | undefined,
      selection: string | undefined,
      line: number | string | null | undefined,
      game: any | undefined
    ): string => {
      const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
      const isTotal = betType === 'total' || selection === 'over' || selection === 'under';
      const isSide = selection === 'home' || selection === 'away';
      const numLine = typeof line === 'number' ? line : typeof line === 'string' ? Number(line) : undefined;
      if (isTotal) {
        const l = typeof numLine === 'number' ? Math.abs(numLine) : undefined;
        return `${(selection || '').toUpperCase()} ${l ?? ''}`.trim();
      }
      if (betType === 'moneyline' || (isSide && (numLine === undefined || numLine === null))) {
        const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
        return `${team ?? cap(selection)} WIN`;
      }
      if (isSide) {
        const team = selection === 'home' ? game?.homeTeam?.shortName : game?.awayTeam?.shortName;
        const sign = typeof numLine === 'number' && numLine > 0 ? '+' : '';
        return `${team ?? cap(selection)} ${typeof numLine === 'number' ? `${sign}${numLine}` : ''}`.trim();
      }
      return `${cap(selection)} ${typeof numLine === 'number' ? numLine : ''}`.trim();
    };

    const normalized = bets.map((bet: any) => {
      // Handle parlay and teaser bets
      if (bet.betType === "parlay" || bet.betType === "teaser") {
        const legsRaw = toLegArray(bet.legs);
        // Sanitize legs to avoid downstream validation issues
        const legs = Array.isArray(legsRaw)
          ? legsRaw
              .filter((leg) => {
                // Keep only legs with minimally required fields
                const hasSelection = typeof leg?.selection === 'string' && leg.selection.length > 0;
                const hasOdds = typeof leg?.odds === 'number' && !Number.isNaN(leg.odds);
                return hasSelection && hasOdds;
              })
              .map((leg) => {
                const gameData = leg?.gameId ? legGamesById[leg.gameId] : undefined;
                return {
                  ...leg,
                  line:
                    typeof leg.line === 'number'
                      ? leg.line
                      : typeof leg.line === 'string'
                      ? Number(leg.line)
                      : undefined,
                  game: gameData ? JSON.parse(JSON.stringify(gameData)) : undefined,
                  betType: leg.betType, // Ensure betType is preserved
                  // ✅ Preserve player prop and game prop metadata for parlay legs
                  playerProp: leg.playerProp,
                  gameProp: leg.gameProp,
                  displaySelection: computeSelectionLabel(leg.betType, leg.selection, leg.line ?? undefined, gameData as any),
                };
              })
          : null;
        return { ...bet, legs } as any;
      }
      
      // Handle advanced bet types: round_robin, if_bet, reverse, bet_it_all
      if (["round_robin", "if_bet", "reverse", "bet_it_all"].includes(bet.betType) && bet.legs) {
        try {
          const metadata = typeof bet.legs === "string" ? JSON.parse(bet.legs) : bet.legs;
          
          // Enrich selections/legs with game data
          if (metadata.selections && Array.isArray(metadata.selections)) {
            metadata.selections = metadata.selections.map((sel: any) => ({
              ...sel,
              game: sel.gameId ? legGamesById[sel.gameId] : undefined,
            }));
          }
          
          if (metadata.legs && Array.isArray(metadata.legs)) {
            metadata.legs = metadata.legs.map((leg: any) => ({
              ...leg,
              game: leg.gameId ? legGamesById[leg.gameId] : undefined,
            }));
          }
          
          // Add user-friendly display info
          if (bet.betType === "round_robin") {
            metadata.display = {
              numParlays: metadata.parlays?.length || 0,
              types: metadata.roundRobinTypes || [],
              stakePerParlay: metadata.stakePerParlay,
            };
          } else if (bet.betType === "if_bet") {
            metadata.display = {
              numLegs: metadata.legs?.length || 0,
              condition: metadata.condition,
              activeLegIndex: metadata.legs?.findIndex((l: any) => l.status === 'active') || 0,
            };
          } else if (bet.betType === "reverse") {
            metadata.display = {
              numSequences: metadata.sequences?.length || 0,
              type: metadata.type,
              stakePerSequence: metadata.stakePerSequence,
            };
          } else if (bet.betType === "bet_it_all") {
            metadata.display = {
              numLegs: metadata.legs?.length || 0,
              initialStake: metadata.initialStake,
              allOrNothing: metadata.allOrNothing,
              activeLegIndex: metadata.legs?.findIndex((l: any) => l.status === 'active') || 0,
            };
          }
          
          return { ...bet, legs: metadata } as any;
        } catch (e) {
          logger.error('[my-bets] Error enriching advanced bet:', { betId: bet.id, error: e });
          return bet as any;
        }
      }
      
      // Return other bet types unchanged
      return bet as any;
    });

    // Convert Decimal fields to numbers for client consumption
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      // Prisma Decimal
      if (v && typeof v === "object" && "toNumber" in (v as Record<string, unknown>)) {
        try { return (v as unknown as { toNumber: () => number }).toNumber(); } catch { /* noop */ }
      }
      if (typeof v === "string") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
      return 0;
    };

    // Compute the actual result for display on settled bets
    const computeActualResult = (
      betOrLeg: any, 
      game: any, 
      playerStatsMap: Map<string, PlayerGameStats>,
      periodScoresMap: Map<string, { home: number; away: number }>,
      parentStatus?: string
    ): string | undefined => {
      // Only show results for settled bets (check parent status for legs)
      const status = parentStatus || betOrLeg.status;
      if (status === 'pending') return undefined;
      if (!game) return undefined;

      const homeScore = game.homeScore;
      const awayScore = game.awayScore;
      
      if (homeScore === null || awayScore === null) return undefined;

      const betType = betOrLeg.betType;
      const selection = betOrLeg.selection;
      const line = betOrLeg.line;

      switch (betType) {
        case 'spread':
          const spreadDiff = selection === 'home' 
            ? homeScore - awayScore 
            : awayScore - homeScore;
          const team = selection === 'home' ? game.homeTeam?.shortName : game.awayTeam?.shortName;
          return `${team} ${spreadDiff > 0 ? 'won' : 'lost'} by ${Math.abs(spreadDiff)}`;
        
        case 'moneyline':
          const mlWinner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'tie';
          const mlTeam = selection === 'home' ? game.homeTeam?.shortName : game.awayTeam?.shortName;
          return mlWinner === 'tie' 
            ? `Tie ${homeScore}-${awayScore}` 
            : `${mlTeam} ${mlWinner === selection ? 'won' : 'lost'} ${awayScore}-${homeScore}`;
        
        case 'total':
          const total = homeScore + awayScore;
          return `Total: ${total} (${line ? (total > line ? 'Over' : total < line ? 'Under' : 'Push') : ''})`;
        
        case 'player_prop':
          // Display actual player stats using SDK structure: event.results['game'][playerID][statID]
          const playerProp = betOrLeg.playerProp;
          if (playerProp?.playerId && playerProp?.statType && game.id) {
            const statsKey = `${game.id}:${playerProp.playerId}`;
            const playerStats = playerStatsMap.get(statsKey);
            
            if (playerStats && playerStats[playerProp.statType] !== undefined) {
              const actualValue = playerStats[playerProp.statType];
              const statLabel = playerProp.statType.replace(/_/g, ' ');
              return `${actualValue} ${statLabel}`;
            }
          }
          
          // No fallback - if stats unavailable, return undefined (no result shown)
          return undefined;
        
        case 'game_prop':
          // Display actual game prop results using SDK structure: event.results[periodID]['home'|'away'][statID]
          const gameProp = betOrLeg.gameProp;
          
          // If we have periodID (quarter/half props), fetch the actual period score
          if (gameProp?.periodID && game.id) {
            const periodKey = `${game.id}:${gameProp.periodID}`;
            const periodScore = periodScoresMap.get(periodKey);
            
            if (periodScore) {
              const periodName = gameProp.periodID.toUpperCase();
              
              // Determine what to show based on prop type
              const propDesc = gameProp.description?.toLowerCase() || gameProp.propType?.toLowerCase() || '';
              
              // Team-specific period prop (e.g., "Lakers 1Q points")
              if (propDesc.includes('home') || propDesc.includes(game.homeTeam?.shortName?.toLowerCase() || '')) {
                return `${game.homeTeam?.shortName} ${periodName}: ${periodScore.home} points`;
              }
              if (propDesc.includes('away') || propDesc.includes(game.awayTeam?.shortName?.toLowerCase() || '')) {
                return `${game.awayTeam?.shortName} ${periodName}: ${periodScore.away} points`;
              }
              
              // Total period prop (e.g., "1Q total points")
              if (propDesc.includes('total')) {
                const periodTotal = periodScore.home + periodScore.away;
                return `${periodName} Total: ${periodTotal} points`;
              }
              
              // Generic fallback: show both scores
              return `${periodName}: ${game.awayTeam?.shortName} ${periodScore.away} - ${periodScore.home} ${game.homeTeam?.shortName}`;
            }
          }
          
          // Fallback for full-game props without periodID (use final scores)
          const gamePropDesc = gameProp?.description || gameProp?.propType;
          if (gamePropDesc && gamePropDesc.toLowerCase().includes('total')) {
            const total = homeScore + awayScore;
            return `Final Total: ${total} points`;
          }
          if (gamePropDesc && (gamePropDesc.toLowerCase().includes('home') || gamePropDesc.toLowerCase().includes(game.homeTeam?.shortName?.toLowerCase() || ''))) {
            return `${game.homeTeam?.shortName} scored ${homeScore} points`;
          }
          if (gamePropDesc && (gamePropDesc.toLowerCase().includes('away') || gamePropDesc.toLowerCase().includes(game.awayTeam?.shortName?.toLowerCase() || ''))) {
            return `${game.awayTeam?.shortName} scored ${awayScore} points`;
          }
          
          // No result available
          return undefined;
        
        default:
          return undefined;
      }
    };

    // Transform game data to match BetCard expectations
    const transformGameForBetCard = (game: any) => {
      if (!game) return undefined;
      const fallbackShort = (name?: string) => {
        if (!name || typeof name !== 'string') return undefined;
        const parts = name.trim().split(/\s+/);
        return parts[parts.length - 1];
      };
      return {
        id: game.id,
        homeTeam: {
          id: game.homeTeam?.id,
          name: game.homeTeam?.name,
          shortName: game.homeTeam?.shortName ?? fallbackShort(game.homeTeam?.name),
          logo: game.homeTeam?.logo,
        },
        awayTeam: {
          id: game.awayTeam?.id,
          name: game.awayTeam?.name,
          shortName: game.awayTeam?.shortName ?? fallbackShort(game.awayTeam?.name),
          logo: game.awayTeam?.logo,
        },
        league: {
          id: game.league?.id,
          name: game.league?.name,
          logo: game.league?.logo,
        },
      };
    };
    
    // Batch fetch player stats for all player prop bets
    const playerStatsRequests: Array<{ gameId: string; playerId: string }> = [];
    const periodScoreRequests: Array<{ gameId: string; periodID: string }> = [];
    
    // Collect all player prop bets and game prop bets that need data
    normalized.forEach((b: any) => {
      if (b.status !== 'pending' && b.game?.id) {
        // Player props: need player stats
        if (b.betType === 'player_prop') {
          let playerProp;
          if (b.legs) {
            try {
              const metadata = typeof b.legs === 'string' ? JSON.parse(b.legs) : b.legs;
              playerProp = metadata.playerProp;
            } catch {
              // Ignore parse errors
            }
          }
          
          if (playerProp?.playerId) {
            playerStatsRequests.push({
              gameId: b.game.id,
              playerId: playerProp.playerId,
            });
          }
        }
        
        // Game props: need period scores if periodID exists
        if (b.betType === 'game_prop') {
          let gameProp;
          if (b.legs) {
            try {
              const metadata = typeof b.legs === 'string' ? JSON.parse(b.legs) : b.legs;
              gameProp = metadata.gameProp;
            } catch {
              // Ignore parse errors
            }
          }
          
          if (gameProp?.periodID) {
            periodScoreRequests.push({
              gameId: b.game.id,
              periodID: gameProp.periodID,
            });
          }
        }
      }
      
      // Check parlay legs for player props and game props
      if (b.betType === 'parlay' && b.status !== 'pending' && Array.isArray(b.legs)) {
        b.legs.forEach((leg: any) => {
          if (leg.game?.id) {
            // Player props in parlay
            if (leg.betType === 'player_prop' && leg.playerProp?.playerId) {
              playerStatsRequests.push({
                gameId: leg.game.id,
                playerId: leg.playerProp.playerId,
              });
            }
            
            // Game props in parlay
            if (leg.betType === 'game_prop' && leg.gameProp?.periodID) {
              periodScoreRequests.push({
                gameId: leg.game.id,
                periodID: leg.gameProp.periodID,
              });
            }
          }
        });
      }
    });
    
    // Fetch all player stats in one batch
    const playerStatsMap = playerStatsRequests.length > 0
      ? await batchFetchPlayerStats(playerStatsRequests)
      : new Map<string, PlayerGameStats>();
    
    logger.info(`Fetched player stats for ${playerStatsMap.size} player-game combinations`);
    
    // Fetch all period scores
    const periodScoresMap = new Map<string, { home: number; away: number }>();
    
    if (periodScoreRequests.length > 0) {
      // Fetch period scores in parallel
      await Promise.all(
        periodScoreRequests.map(async ({ gameId, periodID }) => {
          const periodScore = await getPeriodScore(gameId, periodID);
          if (periodScore) {
            periodScoresMap.set(`${gameId}:${periodID}`, periodScore);
          }
        })
      );
      
      logger.info(`Fetched period scores for ${periodScoresMap.size} game-period combinations`);
    }
    
    const serialized = normalized.map((b: any) => {
      const gameForCard = transformGameForBetCard(b.game);
      
      // Parse player/game prop metadata from legs JSON field for single bets
      let playerProp;
      let gameProp;
      let marketCategory;
      let periodID;
      if (b.betType !== 'parlay' && b.legs) {
        try {
          const metadata = typeof b.legs === 'string' ? JSON.parse(b.legs) : b.legs;
          playerProp = metadata.playerProp;
          gameProp = metadata.gameProp;
          // Patch: ensure marketCategory and periodID are included for game props
          if (gameProp) {
            marketCategory = gameProp.marketCategory ?? metadata.marketCategory;
            periodID = gameProp.periodID ?? metadata.periodID;
            // Attach to gameProp for frontend consumption
            gameProp = { ...gameProp, marketCategory, periodID };
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      // Use stored actualResult if available, otherwise compute it dynamically
      // This ensures we show the result even if game data changes later
      const actualResult = b.actualResult || computeActualResult({ ...b, playerProp, gameProp }, b.game, playerStatsMap, periodScoresMap);
      
      // end of per-bet processing
      
      return {
        ...(b as Record<string, unknown>),
        stake: toNum((b as Record<string, unknown>).stake),
        potentialPayout: toNum((b as Record<string, unknown>).potentialPayout),
        // Transform game data for BetCard compatibility
        game: gameForCard,
        // Include player/game prop metadata for display
        playerProp,
        gameProp,
        // Patch: include marketCategory and periodID at top level for frontend/mobile UI
        marketCategory: marketCategory ?? b.marketCategory,
        periodID: periodID ?? b.periodID,
        // Include teaser metadata for teaser bets
        teaserType: b.teaserType || undefined,
        teaserMetadata: b.teaserMetadata ? (typeof b.teaserMetadata === 'string' ? JSON.parse(b.teaserMetadata) : b.teaserMetadata) : undefined,
        // Provide a server-side label for singles too
        displaySelection: b.betType !== 'parlay'
          ? computeSelectionLabel(b.betType, b.selection, (b as any).line, gameForCard)
          : undefined,
        // Add actual result for settled bets
        actualResult,
        // Transform parlay legs game data
        legs: Array.isArray(b.legs)
          ? b.legs.map((leg: any) => {
          const legMarketCategory = leg.gameProp?.marketCategory ?? leg.marketCategory;
          const legPeriodID = leg.gameProp?.periodID ?? leg.periodID;
              return {
                ...leg,
                game: transformGameForBetCard(leg.game),
                // Ensure player prop and game prop metadata is preserved
                playerProp: leg.playerProp,
                gameProp: leg.gameProp ? { ...leg.gameProp, marketCategory: legMarketCategory, periodID: legPeriodID } : undefined,
                // Patch: include marketCategory and periodID at leg level for frontend/mobile UI
                marketCategory: legMarketCategory,
                periodID: legPeriodID,
                // Use stored actualResult if available, otherwise compute dynamically
                actualResult: leg.actualResult || computeActualResult(leg, leg.game, playerStatsMap, periodScoresMap, b.status),
              };
            })
          : b.betType === 'parlay' ? b.legs : null, // Keep parlay legs, null out single bet metadata
      };
    });
    
    logger.info('Bet history fetched successfully', { count: serialized.length });
    // finished serializing bets
    // Validate response shape; on failure, try to recover gracefully
    try {
      const safe = BetsResponseSchema.parse(serialized);
      return successResponse(JSON.parse(JSON.stringify(safe)));
    } catch (e) {
      logger.warn('Bet history validation failed, returning best-effort data', {
        error: (e as any)?.message,
      });
      // Fallback: strip to minimal public fields to avoid runtime errors
      const fallback = normalized.map((b: any) => ({
        id: b.id,
        betType: b.betType,
        selection: b.selection,
        odds: typeof b.odds === 'number' ? b.odds : Number(b.odds) || 0,
        line: typeof b.line === 'number' ? b.line : b.line ?? null,
        stake: toNum(b.stake),
        potentialPayout: toNum(b.potentialPayout),
        status: b.status,
        placedAt: b.placedAt,
        settledAt: b.settledAt ?? null,
        actualResult: b.actualResult || computeActualResult(b, b.game, new Map(), new Map()),
        game: b.game ?? undefined,
        legs: Array.isArray(b.legs)
          ? b.legs
              .filter((leg: any) => typeof leg?.selection === 'string' && typeof leg?.odds === 'number')
              .map((leg: any) => ({
                selection: leg.selection,
                odds: leg.odds,
                line: typeof leg.line === 'number' ? leg.line : undefined,
                game: leg.game ?? undefined,
                actualResult: leg.actualResult || computeActualResult(leg, leg.game, new Map(), new Map(), b.status),
              }))
          : null,
      }));
      return successResponse(JSON.parse(JSON.stringify(fallback)));
    }
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    // Check if request has a body
    const contentLength = req.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      logger.warn('Empty request body received');
      return ApiErrors.badRequest('Request body is required');
    }

    const body = await req.json();
    logger.info('Placing bet', { betType: body?.betType });

    const userId = await getAuthUser();
    logger.info('Got user ID from auth', { userId });

    // Check if user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        username: true, 
        name: true,
        password: true,
        parentAgentId: true 
      }
    });
    
    if (!userExists) {
      logger.error('User not found in database', { userId });
      throw new Error(`User ${userId} not found in database`);
    }
    
    logger.info('User exists in database', { user: userExists });

    // Idempotency key support for preventing duplicate bet placements
    const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;
    
    if (idempotencyKey) {
      // Check if bet with this idempotency key already exists
      const existingBet = await prisma.bet.findUnique({
        where: { idempotencyKey },
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
      
      if (existingBet) {
        logger.info('Bet already exists with idempotency key', { idempotencyKey });
        // Validate shape based on bet type before returning
        try {
          if (existingBet.betType === 'parlay') {
            ParlayBetResponseSchema.parse(existingBet as any);
          } else {
            SingleBetResponseSchema.parse(existingBet as any);
          }
        } catch {
          // If validation fails, still return the raw existing bet for idempotency contract
        }
        return successResponse(JSON.parse(JSON.stringify(existingBet)), 200);
      }
    }

    const isParlay = body?.betType === "parlay";
    let data: z.infer<typeof BetRequestSchema>;
    try {
      data = isParlay ? ParlayBetRequestSchema.parse(body) : SingleBetRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        return ApiErrors.unprocessable('Invalid bet data', error.errors);
      }
      throw error;
    }

    // Use transaction to ensure data consistency
  const result = await prisma.$transaction(async (tx: any) => {
      // Check if user has sufficient balance (create account if doesn't exist)
      let account = await tx.account.findUnique({
        where: { userId },
        select: { balance: true },
      });

      // Auto-create account if it doesn't exist (for legacy users)
      if (!account) {
        console.warn("[POST /api/my-bets] Account not found, creating new account for user:", userId);
        account = await tx.account.create({
          data: {
            userId,
            balance: 1000.0, // Starting balance for legacy users
          },
          select: { balance: true },
        });
        console.log("[POST /api/my-bets] Account created with balance:", account.balance);
      }

      const currentBalance = Number(account.balance);
      const stakeAmount = Number(data.stake);

      // Calculate risk from pending bets
      const pendingBets = await tx.bet.findMany({
        where: { userId, status: 'pending' },
        select: { stake: true },
      });
  const currentRisk = pendingBets.reduce((sum: number, bet: any) => sum + Number(bet.stake), 0);
      const availableBalance = currentBalance - currentRisk;

      if (availableBalance < stakeAmount) {
        throw new Error(`Insufficient available balance. Balance: $${currentBalance.toFixed(2)}, At Risk: $${currentRisk.toFixed(2)}, Available: $${availableBalance.toFixed(2)}, Required: $${stakeAmount.toFixed(2)}`);
      }

      // DO NOT deduct stake from balance when placing bet
      // Balance is only adjusted when bet settles (win = add payout, loss = deduct stake)

      // Transaction record is now automatically created via Prisma extension

    // For parlay bets
    if (data.betType === "parlay") {
      const parlayLegs = (data as any).legs;
      logger.info('Creating parlay bet', { legs: Array.isArray(parlayLegs) ? parlayLegs.length : 0 });
      const parlayBet = await tx.bet.create({
        data: {
          betType: "parlay",
          stake: data.stake,
          potentialPayout: data.potentialPayout,
          status: data.status || "pending",
          placedAt: new Date(),
          userId,
          selection: "parlay",
          odds: data.odds ?? 0,
          line: null,
          gameId: null,
          legs: parlayLegs ?? null,
          idempotencyKey,
        },
      });
      logger.info('Parlay bet created', { betId: parlayBet.id });
      return parlayBet;
    }

    // For single bets
    if (!data.gameId || !data.selection || !data.odds) {
      throw new Error("Missing required single bet fields");
    }

    // Verify game exists
    const game = await tx.game.findUnique({
      where: { id: data.gameId },
      select: { id: true, status: true, startTime: true },
    });

    if (!game) {
      throw new Error(`Game not found: ${data.gameId}`);
    }

    if (game.status === "finished") {
      throw new Error("Cannot place bet on finished game");
    }

    // === INDUSTRY STANDARD: PERIOD/QUARTER/HALF BET CUTOFF ENFORCEMENT ===
    // If this is a game prop bet with a period/quarter/half, enforce cutoff
    if (data.betType === "game_prop" && (data as any).legs) {
      try {
        const dataLegs = (data as any).legs;
        const metadata = typeof dataLegs === "string" ? JSON.parse(dataLegs) : dataLegs;
        const gameProp = metadata.gameProp;
        if (gameProp?.periodID) {
          // Determine segment start time (requires mapping periodID to actual time)
          // For now, use game.startTime as base and add offset for segment
          // TODO: Replace with actual segment start time if available from SDK
          const segmentStart = new Date(game.startTime);
          let offsetMinutes = 0;
          // Example: NBA quarters (12 min each), NHL periods (20 min each)
          if (gameProp.periodID === "1q" || gameProp.periodID === "1p") offsetMinutes = 0;
          if (gameProp.periodID === "2q" || gameProp.periodID === "2p") offsetMinutes = 12;
          if (gameProp.periodID === "3q" || gameProp.periodID === "3p") offsetMinutes = 24;
          if (gameProp.periodID === "4q") offsetMinutes = 36;
          if (gameProp.periodID === "1h") offsetMinutes = 0;
          if (gameProp.periodID === "2h") offsetMinutes = 24;
          // Add offset to segment start
          segmentStart.setMinutes(segmentStart.getMinutes() + offsetMinutes);
          // Industry standard: lock bets 1 minute before segment starts
          const cutoff = new Date(segmentStart.getTime() - 1 * 60 * 1000);
          const now = new Date();
          if (now >= cutoff) {
            throw new Error(`Betting for ${gameProp.periodID} is closed (cutoff: ${cutoff.toISOString()})`);
          }
        }
      } catch {
        // If metadata parse fails, fallback to normal bet placement
      }
    }

    logger.info('Creating single bet', { gameId: data.gameId, betType: data.betType });

    const bet = await tx.bet.create({
      data: {
        gameId: data.gameId,
        betType: data.betType,
        selection: data.selection,
        odds: data.odds,
        line: data.line ?? null,
        stake: data.stake,
        potentialPayout: data.potentialPayout ?? 0,
        status: data.status || "pending",
        placedAt: new Date(),
        userId,
        idempotencyKey,
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
    logger.info('Single bet created', { betId: bet.id });
    return bet;
  });

    // Validate response before sending
    try {
      if ((result as any).betType === 'parlay') {
        ParlayBetResponseSchema.parse(result as any);
      } else {
        SingleBetResponseSchema.parse(result as any);
      }
    } catch (e) {
      logger.warn('Response validation failed for bet create', { error: (e as any)?.message });
    }

    return successResponse(JSON.parse(JSON.stringify(result)), 201);
  });
}
