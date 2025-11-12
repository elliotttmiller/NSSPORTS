/**
 * Manual Bet Settlement API
 * 
 * Allows admins to manually settle bets or trigger settlement for specific games.
 * Useful for:
 * - Testing settlement logic
 * - Manual corrections
 * - Emergency settlements
 * - Settling games immediately without waiting for cron
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { settleBet, settleGameBets, settleAllFinishedGames } from "@/services/bet-settlement";

/**
 * POST /api/admin/settle-bets
 * 
 * Body options:
 * - { betId: "xxx" } - Settle a specific bet
 * - { gameId: "xxx" } - Settle all bets for a game
 * - { all: true } - Settle all finished games
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - must be logged in" },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: "Forbidden - admin access required" },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();

    // Settle specific bet
    if (body.betId) {
      console.log(`[admin/settle-bets] Settling bet ${body.betId}`);
      const result = await settleBet(body.betId);
      
      if (!result) {
        return NextResponse.json(
          { error: "Failed to settle bet - may be already settled or invalid" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Bet settled as ${result.status}`,
        result
      });
    }

    // Settle all bets for a game
    if (body.gameId) {
      console.log(`[admin/settle-bets] Settling all bets for game ${body.gameId}`);
      const results = await settleGameBets(body.gameId);
      
      return NextResponse.json({
        success: true,
        message: `Settled ${results.length} bets for game`,
        summary: {
          betsSettled: results.length,
          wonBets: results.filter(r => r.status === "won").length,
          lostBets: results.filter(r => r.status === "lost").length,
          pushBets: results.filter(r => r.status === "push").length
        },
        results
      });
    }

    // Settle all finished games
    if (body.all === true) {
      console.log(`[admin/settle-bets] Settling all finished games`);
      const result = await settleAllFinishedGames();
      
      return NextResponse.json({
        success: true,
        message: `Settlement complete`,
        result: {
          gamesProcessed: result.gamesProcessed,
          betsSettled: result.betsSettled,
          wonBets: result.results.filter(r => r.status === "won").length,
          lostBets: result.results.filter(r => r.status === "lost").length,
          pushBets: result.results.filter(r => r.status === "push").length
        }
      });
    }

    return NextResponse.json(
      { error: "Invalid request - must provide betId, gameId, or all: true" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[admin/settle-bets] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
