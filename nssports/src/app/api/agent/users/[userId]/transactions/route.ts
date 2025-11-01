import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agent/users/[userId]/transactions
 * 
 * Fetch recent transactions for a specific player
 * Only accessible by agents who manage this player
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();

    // Check if user is authenticated and is an agent or admin
    if (!session?.user || (!session.user.isAgent && !session.user.isAdmin)) {
      return NextResponse.json(
        { error: "Unauthorized. Agent access required." },
        { status: 401 }
      );
    }

    // Next.js 15: params is now a Promise and must be awaited
    const { userId } = await params;

    // Get the limit from query params (default 5)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    // The userId is from the User table, but transactions are stored with DashboardPlayer IDs
    // First, fetch the user to get their username
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, parentAgentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the user belongs to this agent (if agent, not admin)
    if (session.user.isAgent && !session.user.isAdmin) {
      if (user.parentAgentId !== session.user.id) {
        return NextResponse.json(
          { error: "Player not found or not managed by you" },
          { status: 404 }
        );
      }
    }

    // Find the corresponding DashboardPlayer by username
    const dashboardPlayer = await prisma.dashboardPlayer.findUnique({
      where: { username: user.username },
      select: { id: true },
    });

    // If no DashboardPlayer exists, return empty transactions
    if (!dashboardPlayer) {
      return NextResponse.json({
        success: true,
        transactions: [],
      });
    }

    // Fetch recent transactions using the DashboardPlayer ID
    const transactions = await prisma.playerTransaction.findMany({
      where: {
        playerId: dashboardPlayer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        reason: t.reason,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching player transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
