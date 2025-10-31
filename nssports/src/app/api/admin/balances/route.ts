import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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
    const { payload } = await jwtVerify(token, secret);
    const adminId = payload.adminId as string;

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
    if (type === "deposit" || type === "correction") {
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

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: adminId,
        action: "BALANCE_ADJUSTMENT",
        targetId: playerId,
        targetType: "player",
        details: {
          type,
          amount,
          reason,
          previousBalance: player.balance,
          newBalance,
        },
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      }
    });

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
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    await jwtVerify(token, secret);

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

    return NextResponse.json({
      summary: {
        totalPlatformBalance,
        todayDeposits: deposits,
        todayWithdrawals: withdrawals,
        netMovement,
      },
    });
  } catch (error) {
    console.error("Balance summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance summary" },
      { status: 500 }
    );
  }
}
