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
 * Get all players for a specific agent
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: agentId } = await params;

    // Fetch agent's players from DashboardPlayer table
    const dashboardPlayers = await prisma.dashboardPlayer.findMany({
      where: {
        agentId: agentId,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        status: true,
        registeredAt: true,
        lastLogin: true,
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    // Get real-time data for each player from User/Account/Bet tables
    const playersWithRealTimeData = await Promise.all(
      dashboardPlayers.map(async (player) => {
        // Find the corresponding User record with all real-time data
        const user = await prisma.user.findFirst({
          where: { username: player.username },
          include: {
            account: { select: { balance: true, updatedAt: true } },
            bets: {
              select: { 
                id: true,
                stake: true, 
                status: true,
                placedAt: true,
                potentialPayout: true,
              },
              orderBy: { placedAt: 'desc' }
            }
          }
        });

        if (!user) {
          // Player exists in DashboardPlayer but not in User table
          return {
            id: player.id,
            username: player.username,
            displayName: player.displayName,
            balance: 0,
            risk: 0,
            available: 0,
            status: player.status || 'inactive',
            totalBets: 0,
            totalWagered: 0,
            totalWinnings: 0,
            totalPendingBets: 0,
            lastBetAt: null,
            registeredAt: player.registeredAt,
            lastLogin: player.lastLogin,
          };
        }

        // Calculate real-time balance metrics
        const balance = user.account ? Number(user.account.balance) : 0;
        const pendingBets = user.bets.filter(b => b.status === 'pending');
        const risk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
        const available = Math.max(0, balance - risk);

        // Calculate total statistics from all bets
        const totalBets = user.bets.length;
        const totalWagered = user.bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
        const wonBets = user.bets.filter(b => b.status === 'won');
        const totalWinnings = wonBets.reduce((sum, bet) => sum + Number(bet.potentialPayout || 0), 0);
        const lastBet = user.bets.length > 0 ? user.bets[0].placedAt : null;

        return {
          id: player.id,
          username: player.username,
          displayName: player.displayName || user.name,
          balance,
          risk,
          available,
          status: player.status || 'active',
          totalBets,
          totalWagered,
          totalWinnings,
          totalPendingBets: pendingBets.length,
          lastBetAt: lastBet,
          registeredAt: player.registeredAt || user.createdAt,
          lastLogin: player.lastLogin || user.lastLogin,
        };
      })
    );

    return NextResponse.json({
      players: playersWithRealTimeData,
      count: playersWithRealTimeData.length,
    });
  } catch (error) {
    console.error("Error fetching agent players:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
