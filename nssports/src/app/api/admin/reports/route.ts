import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    await jwtVerify(token, secret);

    const body = await req.json();
    const { reportType, dateFrom, dateTo, format } = body;

    // TODO: After Prisma regeneration, implement actual report generation
    // Based on reportType (financial, agents, players, system)
    // Query relevant data from Prisma
    // Generate report in requested format (CSV or PDF)

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

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    await jwtVerify(token, secret);

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "financial";

    // Mock data for report preview
    let reportData = {};

    if (reportType === "financial") {
      reportData = {
        totalRevenue: 1287456,
        totalPayouts: 987234,
        netProfit: 300222,
        revenueGrowth: 12.5,
        payoutsGrowth: 8.2,
        profitGrowth: 18.7,
      };
    } else if (reportType === "agents") {
      reportData = {
        activeAgents: 37,
        totalAdjustments: 1245890,
        avgAdjustment: 3367,
        topAgents: [
          { username: "john_smith", adjustments: 245000 },
          { username: "lisa_ops", adjustments: 198000 },
        ],
      };
    } else if (reportType === "players") {
      reportData = {
        totalPlayers: 2847,
        activePlayers: 1234,
        totalBetsPlaced: 45678,
        avgBetAmount: 125,
      };
    } else if (reportType === "system") {
      reportData = {
        uptime: 99.98,
        avgResponseTime: 124,
        apiCalls: 1200000,
        errorRate: 0.02,
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
