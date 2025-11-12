/**
 * Bet Settlement Cron Job API Route
 * 
 * Automatically settles bets for finished games.
 * This endpoint should be called periodically (e.g., every 5-10 minutes) via:
 * - Vercel Cron Jobs
 * - External cron service (cron-job.org, etc.)
 * - GitHub Actions
 * - Internal scheduler
 * 
 * How it works:
 * 1. Finds all finished games with pending bets
 * 2. Grades each bet based on final scores
 * 3. Updates bet status (won/lost/push)
 * 4. Adjusts player account balances
 * 5. Returns summary of settlement activity
 * 
 * Security:
 * - Should be protected with API key or cron secret
 * - Only accessible to authenticated cron jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { settleAllFinishedGames } from "@/services/bet-settlement";

/**
 * GET /api/cron/settle-bets
 * 
 * Settle all pending bets for finished games
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[settle-bets cron] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[settle-bets cron] Starting settlement run...");
    const startTime = Date.now();

    // Run settlement process
    const result = await settleAllFinishedGames();

    const duration = Date.now() - startTime;

    console.log("[settle-bets cron] Settlement run completed", {
      gamesProcessed: result.gamesProcessed,
      betsSettled: result.betsSettled,
      durationMs: duration
    });

    // Return summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        gamesProcessed: result.gamesProcessed,
        betsSettled: result.betsSettled,
        wonBets: result.results.filter(r => r.status === "won").length,
        lostBets: result.results.filter(r => r.status === "lost").length,
        pushBets: result.results.filter(r => r.status === "push").length
      },
      bets: result.results.map(r => ({
        betId: r.betId,
        status: r.status,
        payout: r.payout
      }))
    });

  } catch (error) {
    console.error("[settle-bets cron] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/settle-bets
 * 
 * Alternative method for cron services that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
