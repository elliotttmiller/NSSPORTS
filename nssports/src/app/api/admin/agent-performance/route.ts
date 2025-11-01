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
 * Agent Performance Metrics API
 * Provides comprehensive agent rankings, commission tracking, and performance analytics
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const agentId = searchParams.get("agentId"); // optional: get specific agent

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);

    // Get all agents with their statistics
    const agents = await prisma.agent.findMany({
      where: agentId ? { id: agentId } : undefined,
      include: {
        players: {
          select: {
            id: true,
            username: true,
            balance: true,
            status: true,
            totalBets: true,
            totalWagered: true,
            totalWinnings: true,
            lastBetAt: true,
            registeredAt: true,
          },
        },
        balanceAdjustmentsLog: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          select: {
            id: true,
            type: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate performance metrics for each agent
    const agentMetrics = await Promise.all(
      agents.map(async (agent) => {
        const activePlayers = agent.players.filter((p) => p.status === "active").length;
        const totalPlayers = agent.players.length;
        
        // Calculate new players in period
        const newPlayersInPeriod = agent.players.filter(
          (p) => new Date(p.registeredAt) >= startDate
        ).length;

        // Calculate player retention (players who bet in last 7 days / total active)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const retainedPlayers = agent.players.filter(
          (p) => p.lastBetAt && new Date(p.lastBetAt) >= sevenDaysAgo
        ).length;
        const retentionRate = activePlayers > 0 ? (retainedPlayers / activePlayers) * 100 : 0;

        // Calculate total adjustments in period
        const totalAdjustments = agent.balanceAdjustmentsLog.reduce(
          (sum, adj) => sum + Math.abs(adj.amount),
          0
        );

        const adjustmentsCount = agent.balanceAdjustmentsLog.length;

        // Calculate adjustment breakdown
        const deposits = agent.balanceAdjustmentsLog.filter((a) => a.type === "deposit")
          .reduce((sum, a) => sum + a.amount, 0);
        const withdrawals = agent.balanceAdjustmentsLog.filter((a) => a.type === "withdrawal")
          .reduce((sum, a) => sum + a.amount, 0);
        const corrections = agent.balanceAdjustmentsLog.filter((a) => a.type === "correction")
          .reduce((sum, a) => sum + a.amount, 0);

        // Calculate player values
        const totalPlayerBalance = agent.players.reduce((sum, p) => sum + p.balance, 0);
        const totalPlayerWagered = agent.players.reduce((sum, p) => sum + p.totalWagered, 0);
        const totalPlayerWinnings = agent.players.reduce((sum, p) => sum + p.totalWinnings, 0);
        const totalPlayerBets = agent.players.reduce((sum, p) => sum + p.totalBets, 0);

        // Calculate GGR (Gross Gaming Revenue) - wagered minus winnings
        const grossRevenue = totalPlayerWagered - totalPlayerWinnings;

        // Calculate commission (if set)
        const commission = agent.commissionRate
          ? (grossRevenue * agent.commissionRate) / 100
          : 0;

        // Calculate average player value
        const avgPlayerValue = totalPlayers > 0 ? totalPlayerBalance / totalPlayers : 0;
        const avgPlayerWagered = totalPlayers > 0 ? totalPlayerWagered / totalPlayers : 0;

        // Calculate activity score (0-100)
        // Based on: player retention, new player acquisition, total adjustments, player activity
        const retentionScore = retentionRate * 0.3;
        const acquisitionScore = Math.min((newPlayersInPeriod / daysAgo) * 100, 30);
        const adjustmentScore = Math.min((adjustmentsCount / daysAgo) * 5, 20);
        const activityScore = Math.min((totalPlayerBets / (daysAgo * totalPlayers)) * 100, 20);
        const performanceScore = Math.round(
          retentionScore + acquisitionScore + adjustmentScore + activityScore
        );

        // Get most recent activity
        const lastActivity = agent.lastLogin || agent.updatedAt;
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine performance tier
        let tier: "platinum" | "gold" | "silver" | "bronze" | "inactive";
        if (performanceScore >= 80) tier = "platinum";
        else if (performanceScore >= 60) tier = "gold";
        else if (performanceScore >= 40) tier = "silver";
        else if (performanceScore >= 20) tier = "bronze";
        else tier = "inactive";

        return {
          agentId: agent.id,
          username: agent.username,
          displayName: agent.displayName,
          status: agent.status,
          tier,
          performanceScore,
          players: {
            total: totalPlayers,
            active: activePlayers,
            newInPeriod: newPlayersInPeriod,
            retained: retainedPlayers,
            retentionRate: Math.round(retentionRate * 100) / 100,
          },
          financials: {
            totalAdjustments: Math.round(totalAdjustments * 100) / 100,
            adjustmentsCount,
            deposits: Math.round(deposits * 100) / 100,
            withdrawals: Math.round(withdrawals * 100) / 100,
            corrections: Math.round(corrections * 100) / 100,
            grossRevenue: Math.round(grossRevenue * 100) / 100,
            commission: Math.round(commission * 100) / 100,
            commissionRate: agent.commissionRate || 0,
          },
          playerMetrics: {
            totalBalance: Math.round(totalPlayerBalance * 100) / 100,
            totalWagered: Math.round(totalPlayerWagered * 100) / 100,
            totalWinnings: Math.round(totalPlayerWinnings * 100) / 100,
            totalBets: totalPlayerBets,
            avgPlayerValue: Math.round(avgPlayerValue * 100) / 100,
            avgPlayerWagered: Math.round(avgPlayerWagered * 100) / 100,
          },
          activity: {
            lastLogin: agent.lastLogin,
            daysSinceActivity,
            dailyAdjustmentUsage: Math.round(agent.currentDailyTotal * 100) / 100,
            dailyAdjustmentLimit: agent.dailyAdjustmentLimit,
            usagePercentage: Math.round((agent.currentDailyTotal / agent.dailyAdjustmentLimit) * 100),
          },
          limits: {
            maxSingleAdjustment: agent.maxSingleAdjustment,
            dailyAdjustmentLimit: agent.dailyAdjustmentLimit,
            canSuspendPlayers: agent.canSuspendPlayers,
          },
          createdAt: agent.createdAt,
        };
      })
    );

    // Sort by performance score
    agentMetrics.sort((a, b) => b.performanceScore - a.performanceScore);

    // Calculate rankings
    const rankedMetrics = agentMetrics.map((agent, index) => ({
      ...agent,
      rank: index + 1,
    }));

    // Calculate overall statistics
    const overallStats = {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === "active").length,
      avgPerformanceScore: Math.round(
        agentMetrics.reduce((sum, a) => sum + a.performanceScore, 0) / agentMetrics.length
      ),
      tierDistribution: {
        platinum: agentMetrics.filter((a) => a.tier === "platinum").length,
        gold: agentMetrics.filter((a) => a.tier === "gold").length,
        silver: agentMetrics.filter((a) => a.tier === "silver").length,
        bronze: agentMetrics.filter((a) => a.tier === "bronze").length,
        inactive: agentMetrics.filter((a) => a.tier === "inactive").length,
      },
      totalCommissions: Math.round(
        agentMetrics.reduce((sum, a) => sum + a.financials.commission, 0) * 100
      ) / 100,
      totalRevenue: Math.round(
        agentMetrics.reduce((sum, a) => sum + a.financials.grossRevenue, 0) * 100
      ) / 100,
      topPerformers: rankedMetrics.slice(0, 5).map((a) => ({
        username: a.username,
        displayName: a.displayName,
        performanceScore: a.performanceScore,
        rank: a.rank,
      })),
    };

    return NextResponse.json({
      period: `${daysAgo} days`,
      agents: rankedMetrics,
      overallStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agent performance metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Calculate commission payouts for period
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, agentIds } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date required" },
        { status: 400 }
      );
    }

    const _start = new Date(startDate);
    const _end = new Date(endDate);

    // Get agents
    const agents = await prisma.agent.findMany({
      where: agentIds ? { id: { in: agentIds } } : { commissionRate: { not: null } },
      include: {
        players: {
          select: {
            totalWagered: true,
            totalWinnings: true,
          },
        },
      },
    });

    // Calculate commission for each agent
    const commissionPayouts = agents.map((agent) => {
      const totalWagered = agent.players.reduce((sum, p) => sum + p.totalWagered, 0);
      const totalWinnings = agent.players.reduce((sum, p) => sum + p.totalWinnings, 0);
      const revenue = totalWagered - totalWinnings;
      const commission = agent.commissionRate
        ? (revenue * agent.commissionRate) / 100
        : 0;

      return {
        agentId: agent.id,
        username: agent.username,
        displayName: agent.displayName,
        commissionRate: agent.commissionRate || 0,
        revenue: Math.round(revenue * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        playerCount: agent.players.length,
      };
    });

    const totalCommissions = commissionPayouts.reduce((sum, c) => sum + c.commission, 0);

    return NextResponse.json({
      startDate,
      endDate,
      commissionPayouts,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      agentCount: commissionPayouts.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Commission calculation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
