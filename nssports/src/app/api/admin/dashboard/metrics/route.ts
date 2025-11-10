import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

// Helper to verify admin authentication
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get real-time metrics from database
    const [
      totalPlayers,
      totalAgents,
      activeBets,
      todayStats,
      systemStats,
    ] = await Promise.all([
      // Total players count
      prisma.dashboardPlayer.count({ where: { status: "active" } }),
      
      // Total agents count
      prisma.agent.count({ where: { status: { not: "suspended" } } }),
      
      // Active bets (pending)
      prisma.playerBet.count({ where: { status: "pending" } }),
      
      // Today's stats
      prisma.playerTransaction.groupBy({
        by: ["type"],
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          type: { in: ["deposit", "withdrawal"] },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // System stats (placeholder - would come from monitoring service)
      Promise.resolve({
        uptime: 99.98,
        responseTime: 87,
        sessions: await prisma.dashboardPlayer.count({
          where: { lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
      }),
    ]);

    // Calculate today's deposits and withdrawals
    const todayDeposits = todayStats.find(s => s.type === "deposit")?._sum.amount || 0;
    const todayWithdrawals = todayStats.find(s => s.type === "withdrawal")?._sum.amount || 0;

    // Get total platform balance
    const totalBalance = await prisma.dashboardPlayer.aggregate({
      _sum: { balance: true },
    });

    // Calculate today's GGR (simplified - bet amount - winnings)
    const todayBets = await prisma.playerBet.findMany({
      where: {
        placedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        status: { in: ["won", "lost"] },
      },
      select: {
        amount: true,
        potentialWin: true,
        status: true,
      },
    });

    const todayGGR = todayBets.reduce((sum, bet) => {
      return sum + bet.amount - (bet.status === "won" ? bet.potentialWin : 0);
    }, 0);

    return NextResponse.json({
      platformActivity: {
        totalPlayers: totalPlayers,
        activeBets: activeBets,
        todayGGR: Math.round(todayGGR * 100) / 100,
      },
      agentPerformance: {
        totalAgents: totalAgents,
      },
      financialSummary: {
        totalBalance: Math.round((totalBalance._sum.balance || 0) * 100) / 100,
        todayDeposits: Math.round(todayDeposits * 100) / 100,
        todayWithdrawals: Math.round(todayWithdrawals * 100) / 100,
        netMovement: Math.round((todayDeposits - todayWithdrawals) * 100) / 100,
      },
      systemHealth: {
        platformUptime: systemStats.uptime,
        apiResponseTime: systemStats.responseTime,
        activeSessions: systemStats.sessions,
        systemLoad: Math.round(Math.random() * 60 + 20), // Placeholder - would come from system monitoring
      },
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
