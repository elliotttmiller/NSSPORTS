/**
 * Bet History API
 * 
 * Fetches settled bets (won/lost/push) for the current user.
 * Separate from pending bets to allow for proper filtering and pagination.
 * 
 * GET /api/bet-history
 * 
 * Query params:
 * - status: Filter by status (won/lost/push/all)
 * - limit: Number of results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 * - betType: Filter by bet type (single/parlay/teaser/etc)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - must be logged in" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const betType = searchParams.get("betType");

    // Build filter conditions
    interface WhereCondition {
      userId: string;
      settledAt: { not: null };
      status?: string | { in: string[] };
      betType?: string;
    }

    const where: WhereCondition = {
      userId: session.user.id,
      settledAt: {
        not: null // Only show settled bets
      }
    };

    // Filter by status
    if (status !== "all") {
      where.status = status;
    } else {
      // Show all settled bets (won/lost/push)
      where.status = {
        in: ["won", "lost", "push"]
      };
    }

    // Filter by bet type
    if (betType) {
      where.betType = betType;
    }

    // Fetch bets with related data
    const bets = await prisma.bet.findMany({
      where,
      include: {
        game: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logo: true
              }
            },
            league: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        }
      },
      orderBy: {
        settledAt: "desc" // Most recent first
      },
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.bet.count({ where });

    // Calculate statistics
    const stats = await prisma.bet.aggregate({
      where: {
        userId: session.user.id,
        settledAt: { not: null }
      },
      _count: true,
      _sum: {
        stake: true,
        potentialPayout: true
      }
    });

    const wonBets = await prisma.bet.count({
      where: {
        userId: session.user.id,
        status: "won"
      }
    });

    const lostBets = await prisma.bet.count({
      where: {
        userId: session.user.id,
        status: "lost"
      }
    });

    const pushBets = await prisma.bet.count({
      where: {
        userId: session.user.id,
        status: "push"
      }
    });

    // Calculate profit/loss
    const wonBetsData = await prisma.bet.findMany({
      where: {
        userId: session.user.id,
        status: "won"
      },
      select: {
        potentialPayout: true,
        stake: true
      }
    });

    const lostBetsData = await prisma.bet.findMany({
      where: {
        userId: session.user.id,
        status: "lost"
      },
      select: {
        stake: true
      }
    });

    const totalProfit = wonBetsData.reduce((sum, bet) => sum + (bet.potentialPayout - bet.stake), 0);
    const totalLoss = lostBetsData.reduce((sum, bet) => sum + bet.stake, 0);
    const netProfit = totalProfit - totalLoss;

    // Format response
    const formattedBets = bets.map(bet => {
      // Parse legs if it's a parlay/teaser
      let legs = null;
      if (bet.legs) {
        try {
          legs = JSON.parse(JSON.stringify(bet.legs));
        } catch (e) {
          console.error("[bet-history] Error parsing legs:", e);
        }
      }

      return {
        id: bet.id,
        betType: bet.betType,
        selection: bet.selection,
        odds: bet.odds,
        line: bet.line,
        stake: bet.stake,
        potentialPayout: bet.potentialPayout,
        status: bet.status,
        placedAt: bet.placedAt.toISOString(),
        settledAt: bet.settledAt?.toISOString(),
        profit: bet.status === "won" 
          ? bet.potentialPayout - bet.stake 
          : bet.status === "lost"
          ? -bet.stake
          : 0,
        game: bet.game ? {
          id: bet.game.id,
          homeTeam: bet.game.homeTeam,
          awayTeam: bet.game.awayTeam,
          league: bet.game.league,
          homeScore: bet.game.homeScore,
          awayScore: bet.game.awayScore,
          startTime: bet.game.startTime.toISOString(),
          status: bet.game.status
        } : null,
        legs,
        teaserType: bet.teaserType,
        teaserMetadata: bet.teaserMetadata
      };
    });

    return NextResponse.json({
      success: true,
      bets: formattedBets,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        totalBets: stats._count,
        wonBets,
        lostBets,
        pushBets,
        totalStaked: stats._sum.stake || 0,
        netProfit,
        winRate: wonBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0
      }
    });

  } catch (error) {
    console.error("[bet-history] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
