import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminUser } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getAdminUser(req);
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { playerId, type, amount, reason } = body;

    // Validate input
    if (!playerId || !type || !amount || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch player
    const player = await prisma.dashboardPlayer.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Calculate new balance
    let newBalance = player.balance;
    if (type === "deposit" || type === "correction" || type === "freeplay") {
      newBalance += parseFloat(amount.toString());
    } else if (type === "withdrawal") {
      newBalance -= parseFloat(amount.toString());
      if (newBalance < 0) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
    }

    // Update player balance
    const updatedPlayer = await prisma.dashboardPlayer.update({
      where: { id: playerId },
      data: { balance: newBalance }
    });

    // Create transaction record
    const transaction = await prisma.playerTransaction.create({
      data: {
        playerId,
        type: type === "correction" ? "adjustment" : type,
        amount: parseFloat(amount.toString()),
        balanceBefore: player.balance,
        balanceAfter: newBalance,
        reason,
      }
    });

    // TODO: Log admin activity when User/AdminUser relationship is established
    // Note: AdminActivityLog currently requires AdminUser FK, but we're using User authentication
    // await prisma.adminActivityLog.create({ ... });

    return NextResponse.json({
      success: true,
      newBalance: updatedPlayer.balance,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        timestamp: transaction.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Balance adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust balance" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getAdminUser(req);
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeAdjustments = searchParams.get("adjustments") === "true";

    // Calculate total platform balance
    const totalBalance = await prisma.dashboardPlayer.aggregate({
      _sum: { balance: true }
    });

    // Get today's start
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Calculate today's deposits
    const todayDeposits = await prisma.playerTransaction.aggregate({
      where: {
        type: "deposit",
        createdAt: { gte: todayStart }
      },
      _sum: { amount: true }
    });

    // Calculate today's withdrawals
    const todayWithdrawals = await prisma.playerTransaction.aggregate({
      where: {
        type: "withdrawal",
        createdAt: { gte: todayStart }
      },
      _sum: { amount: true }
    });

    const totalPlatformBalance = totalBalance._sum.balance || 0;
    const deposits = todayDeposits._sum.amount || 0;
    const withdrawals = todayWithdrawals._sum.amount || 0;
    const netMovement = deposits - withdrawals;

    const response: {
      summary: {
        totalPlatformBalance: number;
        todayDeposits: number;
        todayWithdrawals: number;
        netMovement: number;
      };
      recentAdjustments?: Array<{
        id: string;
        adjuster: string;
        player: string;
        type: string;
        amount: number;
        reason: string | null;
        timestamp: string;
      }>;
    } = {
      summary: {
        totalPlatformBalance,
        todayDeposits: deposits,
        todayWithdrawals: withdrawals,
        netMovement,
      },
    };

    // Optionally include recent adjustments
    if (includeAdjustments) {
      try {
        const recentLogs = await prisma.adminActivityLog.findMany({
          where: { action: "BALANCE_ADJUSTMENT" },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            admin: {
              select: { username: true },
            },
          },
        });

        response.recentAdjustments = recentLogs.map((log) => {
          const details = log.details as { type?: string; amount?: number; reason?: string } | null;
          return {
            id: log.id,
            adjuster: log.admin.username,
            player: log.targetId || "Unknown",
            type: details && typeof details === 'object' && 'type' in details ? String(details.type) : "adjustment",
            amount: details && typeof details === 'object' && 'amount' in details ? Number(details.amount) : 0,
            reason: details && typeof details === 'object' && 'reason' in details ? String(details.reason) : null,
            timestamp: log.createdAt.toISOString(),
          };
        });
      } catch (adjustmentError) {
        console.error("Error fetching adjustments:", adjustmentError);
        // Return empty array if adjustments fetch fails
        response.recentAdjustments = [];
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Balance summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance summary" },
      { status: 500 }
    );
  }
}
