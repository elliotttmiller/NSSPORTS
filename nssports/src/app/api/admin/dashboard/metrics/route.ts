import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

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
      totalBalance,
      todayBets,
      recentLogins,
    ] = await Promise.all([
      // Total players count (users with player role)
      prisma.user.count(),
      
      // Total agents count
      prisma.agent.count({ where: { status: { not: "suspended" } } }),
      
      // Active bets (pending) - use correct Bet table
      prisma.bet.count({ where: { status: "pending" } }),
      
      // Get total platform balance from Account table
      prisma.account.aggregate({
        _sum: { balance: true },
      }),
      
      // Today's bets for GGR calculation
      prisma.bet.findMany({
        where: {
          placedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          status: { in: ["won", "lost"] },
        },
        select: {
          stake: true,
          potentialPayout: true,
          status: true,
        },
      }),
      
      // Recent logins (users active in last 24h)
      prisma.user.count({
        where: { 
          updatedAt: { 
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
          } 
        },
      }),
    ]);

    // Calculate today's deposits and withdrawals (placeholder - you may need transaction tracking)
    const todayDeposits = 0; // TODO: Implement transaction tracking
    const todayWithdrawals = 0; // TODO: Implement transaction tracking

    // Calculate today's GGR (bet stake - payouts)
    const todayGGR = todayBets.reduce((sum, bet) => {
      return sum + bet.stake - (bet.status === "won" ? bet.potentialPayout : 0);
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
        platformUptime: 99.98, // Placeholder
        apiResponseTime: 87, // Placeholder
        activeSessions: recentLogins,
        systemLoad: Math.round(Math.random() * 60 + 20), // Placeholder
      },
    });
  } catch (error) {
    logger.error("Dashboard metrics error", { data: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
