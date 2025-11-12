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
import { syncFinishedGames } from "@/scripts/sync-game-status";

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

    // STEP 1: Sync game status from SDK (NEW - CRITICAL)
    console.log("[settle-bets cron] Step 1: Syncing game status from SDK...");
    const syncResult = await syncFinishedGames();
    console.log("[settle-bets cron] Game sync complete", syncResult);

    // STEP 2: Run settlement process (catches any games missed by sync)
    console.log("[settle-bets cron] Step 2: Running settlement for all finished games...");
    const settlementResult = await settleAllFinishedGames();

    const duration = Date.now() - startTime;

    console.log("[settle-bets cron] Settlement run completed", {
      sync: {
        gamesChecked: syncResult.gamesChecked,
        gamesUpdated: syncResult.gamesUpdated,
        betsSettled: syncResult.betsSettled,
        errors: syncResult.errors.length
      },
      settlement: {
        gamesProcessed: settlementResult.gamesProcessed,
        betsSettled: settlementResult.betsSettled
      },
      durationMs: duration
    });

    // Return comprehensive summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      sync: {
        gamesChecked: syncResult.gamesChecked,
        gamesUpdated: syncResult.gamesUpdated,
        betsSettledDuringSyncSync: syncResult.betsSettled,
        errors: syncResult.errors
      },
      settlement: {
        gamesProcessed: settlementResult.gamesProcessed,
        betsSettled: settlementResult.betsSettled,
        wonBets: settlementResult.results.filter(r => r.status === "won").length,
        lostBets: settlementResult.results.filter(r => r.status === "lost").length,
        pushBets: settlementResult.results.filter(r => r.status === "push").length
      },
      totalBetsSettled: syncResult.betsSettled + settlementResult.betsSettled,
      bets: settlementResult.results.map(r => ({
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
