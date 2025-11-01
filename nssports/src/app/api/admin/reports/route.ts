import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);

    const body = await req.json();
    const { reportType, dateFrom: _dateFrom, dateTo: _dateTo, format } = body;

    // TODO: Implement actual report file generation (CSV/PDF)
    // For now, return download URL placeholder
    return NextResponse.json({
      success: true,
      reportId: `report_${Date.now()}`,
      downloadUrl: `/api/admin/reports/download/${reportType}_${Date.now()}.${format}`,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "financial";

    // Fetch real report data from database
    let reportData = {};

    if (reportType === "financial") {
      // Calculate financial metrics from real data
      const [
        totalPlayerBets,
        totalAgents,
        totalPlayers,
      ] = await Promise.all([
        // Total bets statistics
        prisma.playerBet.aggregate({
          _sum: { amount: true, potentialWin: true },
          _count: true,
        }),
        prisma.agent.count(),
        prisma.dashboardPlayer.count(),
      ]);

      const totalDeposits = await prisma.playerTransaction.aggregate({
        _sum: { amount: true },
        where: { type: "deposit" },
      });

      const totalWagered = totalPlayerBets._sum.amount || 0;
      const totalPayouts = await prisma.playerBet.aggregate({
        _sum: { potentialWin: true },
        where: { status: "won" },
      });

      const totalRevenue = totalDeposits._sum.amount || 0;
      const totalPayoutsAmount = totalPayouts._sum.potentialWin || 0;
      const netProfit = totalRevenue - totalPayoutsAmount;

      reportData = {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPayouts: Math.round(totalPayoutsAmount * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        totalWagered: Math.round(totalWagered * 100) / 100,
        totalBets: totalPlayerBets._count || 0,
        totalAgents,
        totalPlayers,
        revenueGrowth: 0, // TODO: Calculate growth from previous period
        payoutsGrowth: 0,
        profitGrowth: 0,
      };
    } else if (reportType === "agents") {
      // Get agent statistics
      const [agents, totalAdjustments] = await Promise.all([
        prisma.agent.count({ where: { status: "active" } }),
        prisma.agentBalanceLog.aggregate({
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      // Get top agents by player count
      const topAgents = await prisma.agent.findMany({
        take: 5,
        include: {
          _count: {
            select: { players: true },
          },
          balanceAdjustmentsLog: {
            select: { amount: true },
          },
        },
        orderBy: {
          players: {
            _count: "desc",
          },
        },
      });

      const formattedTopAgents = topAgents.map((agent) => ({
        username: agent.username,
        displayName: agent.displayName,
        players: agent._count.players,
        adjustments: agent.balanceAdjustmentsLog.reduce(
          (sum, adj) => sum + Math.abs(adj.amount),
          0
        ),
      }));

      const avgAdjustment =
        totalAdjustments._count > 0
          ? (totalAdjustments._sum.amount || 0) / totalAdjustments._count
          : 0;

      reportData = {
        activeAgents: agents,
        totalAdjustments: Math.round((totalAdjustments._sum.amount || 0) * 100) / 100,
        adjustmentsCount: totalAdjustments._count,
        avgAdjustment: Math.round(avgAdjustment * 100) / 100,
        topAgents: formattedTopAgents,
      };
    } else if (reportType === "players") {
      // Get player statistics
      const [totalPlayers, activePlayers, totalBets, avgBet] = await Promise.all([
        prisma.dashboardPlayer.count(),
        prisma.dashboardPlayer.count({ where: { status: "active" } }),
        prisma.playerBet.count(),
        prisma.playerBet.aggregate({ _avg: { amount: true } }),
      ]);

      reportData = {
        totalPlayers,
        activePlayers,
        totalBetsPlaced: totalBets,
        avgBetAmount: Math.round((avgBet._avg.amount || 0) * 100) / 100,
      };
    } else if (reportType === "system") {
      // Get system metrics
      const [totalLogs, recentLogs, totalAgents, totalPlayers] = await Promise.all([
        prisma.adminActivityLog.count(),
        prisma.adminActivityLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.agent.count(),
        prisma.dashboardPlayer.count(),
      ]);

      reportData = {
        uptime: 99.9, // This would need to be tracked separately
        avgResponseTime: 120, // This would need to be tracked via monitoring
        apiCalls: totalLogs,
        recentApiCalls: recentLogs,
        errorRate: 0.01, // This would need to be tracked via error logging
        totalAgents,
        totalPlayers,
      };
    }

    return NextResponse.json({
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
