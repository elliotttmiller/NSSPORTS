import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Financial Reconciliation API
 * Provides daily balance audits and discrepancy detection
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get opening balance (end of previous day)
    const previousDay = new Date(startOfDay);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(23, 59, 59, 999);
    
    const openingBalanceData = await prisma.dashboardPlayer.aggregate({
      _sum: { balance: true },
    });
    const openingBalance = openingBalanceData._sum.balance || 0;

    // Get all transactions for the day
    const transactions = await prisma.playerTransaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        player: {
          select: {
            username: true,
            agent: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate transaction totals by type
    const transactionSummary = transactions.reduce(
      (acc, t) => {
        switch (t.type) {
          case "deposit":
            acc.deposits += t.amount;
            acc.depositsCount++;
            break;
          case "withdrawal":
            acc.withdrawals += t.amount;
            acc.withdrawalsCount++;
            break;
          case "bet_placed":
            acc.betsPlaced += t.amount;
            acc.betsPlacedCount++;
            break;
          case "bet_won":
            acc.betsWon += t.amount;
            acc.betsWonCount++;
            break;
          case "adjustment":
            if (t.amount > 0) {
              acc.adjustmentsIn += t.amount;
              acc.adjustmentsInCount++;
            } else {
              acc.adjustmentsOut += Math.abs(t.amount);
              acc.adjustmentsOutCount++;
            }
            break;
        }
        return acc;
      },
      {
        deposits: 0,
        depositsCount: 0,
        withdrawals: 0,
        withdrawalsCount: 0,
        betsPlaced: 0,
        betsPlacedCount: 0,
        betsWon: 0,
        betsWonCount: 0,
        adjustmentsIn: 0,
        adjustmentsInCount: 0,
        adjustmentsOut: 0,
        adjustmentsOutCount: 0,
      }
    );

    // Calculate expected closing balance
    const expectedClosing =
      openingBalance +
      transactionSummary.deposits -
      transactionSummary.withdrawals -
      transactionSummary.betsPlaced +
      transactionSummary.betsWon +
      transactionSummary.adjustmentsIn -
      transactionSummary.adjustmentsOut;

    // Get actual closing balance
    const closingBalanceData = await prisma.dashboardPlayer.aggregate({
      _sum: { balance: true },
    });
    const actualClosing = closingBalanceData._sum.balance || 0;

    // Calculate discrepancy
    const discrepancy = actualClosing - expectedClosing;
    const hasDiscrepancy = Math.abs(discrepancy) > 0.01; // Allow 1 cent tolerance for rounding

    // Get agent adjustment breakdown
    const agentAdjustments = await prisma.agentBalanceLog.groupBy({
      by: ["agentId"],
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const agentAdjustmentsWithNames = await Promise.all(
      agentAdjustments.map(async (adj) => {
        const agent = await prisma.agent.findUnique({
          where: { id: adj.agentId },
          select: { username: true, displayName: true },
        });
        return {
          agentId: adj.agentId,
          agentUsername: agent?.username || "Unknown",
          agentDisplayName: agent?.displayName,
          totalAmount: adj._sum.amount || 0,
          transactionCount: adj._count.id,
        };
      })
    );

    // Get large transactions (potential red flags)
    const largeTransactions = transactions
      .filter((t) => Math.abs(t.amount) >= 1000)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        playerUsername: t.player.username,
        agentUsername: t.player.agent?.username || "Unassigned",
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        reason: t.reason,
        timestamp: t.createdAt,
      }));

    // Detect unusual patterns
    const unusualPatterns: Array<{
      type: string;
      severity: string;
      description: string;
      playerId: string;
    }> = [];
    
    // Check for rapid deposit/withdrawal cycles
    const playerActivities = transactions.reduce((acc, t) => {
      if (!acc[t.playerId]) {
        acc[t.playerId] = { deposits: 0, withdrawals: 0, username: t.player.username };
      }
      if (t.type === "deposit") acc[t.playerId].deposits++;
      if (t.type === "withdrawal") acc[t.playerId].withdrawals++;
      return acc;
    }, {} as Record<string, { deposits: number; withdrawals: number; username: string }>);

    Object.entries(playerActivities).forEach(([playerId, data]) => {
      if (data.deposits > 5 && data.withdrawals > 5) {
        unusualPatterns.push({
          type: "rapid_cycle",
          severity: "warning",
          description: `Player ${data.username} has ${data.deposits} deposits and ${data.withdrawals} withdrawals today`,
          playerId,
        });
      }
    });

    return NextResponse.json({
      date,
      reconciliation: {
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance: {
          expected: Math.round(expectedClosing * 100) / 100,
          actual: Math.round(actualClosing * 100) / 100,
        },
        discrepancy: Math.round(discrepancy * 100) / 100,
        hasDiscrepancy,
        status: hasDiscrepancy ? "needs_review" : "balanced",
      },
      transactionSummary: {
        deposits: {
          amount: Math.round(transactionSummary.deposits * 100) / 100,
          count: transactionSummary.depositsCount,
        },
        withdrawals: {
          amount: Math.round(transactionSummary.withdrawals * 100) / 100,
          count: transactionSummary.withdrawalsCount,
        },
        betsPlaced: {
          amount: Math.round(transactionSummary.betsPlaced * 100) / 100,
          count: transactionSummary.betsPlacedCount,
        },
        betsWon: {
          amount: Math.round(transactionSummary.betsWon * 100) / 100,
          count: transactionSummary.betsWonCount,
        },
        adjustments: {
          inflow: Math.round(transactionSummary.adjustmentsIn * 100) / 100,
          inflowCount: transactionSummary.adjustmentsInCount,
          outflow: Math.round(transactionSummary.adjustmentsOut * 100) / 100,
          outflowCount: transactionSummary.adjustmentsOutCount,
        },
      },
      agentAdjustments: agentAdjustmentsWithNames,
      largeTransactions,
      unusualPatterns,
      recentTransactions: transactions.slice(-20).map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        playerUsername: t.player.username,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        timestamp: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Reconciliation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate reconciliation report for date range
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all transactions in range
    const transactions = await prisma.playerTransaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate daily summaries
    const dailySummaries = transactions.reduce((acc, t) => {
      const dateKey = t.createdAt.toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          deposits: 0,
          withdrawals: 0,
          betsPlaced: 0,
          betsWon: 0,
          adjustments: 0,
        };
      }
      
      switch (t.type) {
        case "deposit":
          acc[dateKey].deposits += t.amount;
          break;
        case "withdrawal":
          acc[dateKey].withdrawals += t.amount;
          break;
        case "bet_placed":
          acc[dateKey].betsPlaced += t.amount;
          break;
        case "bet_won":
          acc[dateKey].betsWon += t.amount;
          break;
        case "adjustment":
          acc[dateKey].adjustments += t.amount;
          break;
      }
      
      return acc;
    }, {} as Record<string, { deposits: number; withdrawals: number; betsPlaced: number; betsWon: number; adjustments: number }>);

    return NextResponse.json({
      startDate,
      endDate,
      dailySummaries,
      totalDays: Object.keys(dailySummaries).length,
      reportGenerated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
