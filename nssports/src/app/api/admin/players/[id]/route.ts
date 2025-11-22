import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: playerIdentifier } = await params;

    // playerIdentifier could be either a User ID or DashboardPlayer ID
    // First try to find by User ID, then by username (from DashboardPlayer)
    let player = await prisma.user.findUnique({
      where: { id: playerIdentifier },
      include: {
        account: {
          select: { balance: true },
        },
        bets: {
          orderBy: { placedAt: "desc" },
          take: 50, // Fetch last 50 bets
          include: {
            game: {
              select: {
                homeTeam: true,
                awayTeam: true,
              },
            },
          },
        },
        _count: {
          select: { bets: true },
        },
      },
    });

    // If not found by User ID, try looking up by DashboardPlayer ID -> username -> User
    if (!player) {
      const dashboardPlayer = await prisma.dashboardPlayer.findUnique({
        where: { id: playerIdentifier },
        select: { username: true },
      });

      if (dashboardPlayer) {
        player = await prisma.user.findFirst({
          where: { username: dashboardPlayer.username },
          include: {
            account: {
              select: { balance: true },
            },
            bets: {
              orderBy: { placedAt: "desc" },
              take: 50,
              include: {
                game: {
                  select: {
                    homeTeam: true,
                    awayTeam: true,
                  },
                },
              },
            },
            _count: {
              select: { bets: true },
            },
          },
        });
      }
    }

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Calculate balance metrics
    const balance = player.account ? Number(player.account.balance) : 0;
    const pendingBets = player.bets.filter((bet) => bet.status === "pending");
    const risk = pendingBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    const available = Math.max(0, balance - risk);

    // Calculate betting statistics
    const totalBets = player.bets.length;
    const totalPendingBets = pendingBets.length;
    const totalWagered = player.bets.reduce((sum, bet) => sum + Number(bet.stake), 0);
    
    const wonBets = player.bets.filter((bet) => bet.status === "won");
    const totalWinnings = wonBets.reduce((sum, bet) => {
      const payout = Number(bet.potentialPayout) || 0;
      const stake = Number(bet.stake);
      return sum + (payout - stake); // Net winnings
    }, 0);

    // Format recent bets for the modal
    const recentBets = player.bets.slice(0, 20).map((bet) => {
      let selection = "";
      
      if (bet.betType === "single" && bet.game) {
        selection = `${bet.game.awayTeam.name} @ ${bet.game.homeTeam.name}`;
        if (bet.selection) selection += ` - ${bet.selection}`;
      } else if (bet.betType === "parlay" || bet.betType === "teaser") {
        // bet.legs might be null, a string, or already parsed object
        if (bet.legs) {
          try {
            const legs = typeof bet.legs === 'string' ? JSON.parse(bet.legs) : bet.legs;
            const legCount = Array.isArray(legs) ? legs.length : 0;
            selection = `${legCount} leg ${bet.betType}`;
          } catch {
            // If parsing fails, just show bet type
            selection = bet.betType;
          }
        } else {
          selection = bet.betType;
        }
      }

      return {
        id: bet.id,
        betType: bet.betType,
        selection,
        odds: Number(bet.odds),
        stake: Number(bet.stake),
        potentialPayout: Number(bet.potentialPayout),
        status: bet.status,
        placedAt: bet.placedAt.toISOString(),
        settledAt: bet.settledAt?.toISOString() || null,
      };
    });

    // Format transactions (for now, we'll show bet-related transactions)
    // In the future, this could include deposits, withdrawals, adjustments
    const recentTransactions = player.bets
      .filter((bet) => bet.status === "won" || bet.status === "lost")
      .slice(0, 20)
      .map((bet) => {
        const amount = bet.status === "won" 
          ? Number(bet.potentialPayout) - Number(bet.stake) // Net winnings
          : -Number(bet.stake); // Loss

        return {
          id: bet.id,
          type: bet.status === "won" ? "Bet Win" : "Bet Loss",
          amount,
          reason: `${bet.betType} bet ${bet.status}`,
          timestamp: (bet.settledAt || bet.placedAt).toISOString(),
        };
      });

    const playerDetails = {
      id: player.id,
      username: player.username,
      displayName: player.name,
      balance,
      available,
      risk,
      status: player.isActive ? "active" : "suspended",
      totalBets,
      totalWagered,
      totalWinnings,
      totalPendingBets,
      registeredAt: player.createdAt.toISOString(),
      lastLogin: player.lastLogin?.toISOString() || null,
      lastBetAt: player.bets[0]?.placedAt.toISOString() || null,
      recentBets,
      recentTransactions,
    };

    return NextResponse.json({
      success: true,
      player: playerDetails,
    });
  } catch (error) {
    console.error("Error fetching player details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update player status (suspend/activate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: playerId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || (status !== "active" && status !== "suspended")) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update player status (using isActive field)
    const updatedPlayer = await prisma.user.update({
      where: { id: playerId },
      data: { isActive: status === "active" },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      player: {
        id: updatedPlayer.id,
        username: updatedPlayer.username,
        status: updatedPlayer.isActive ? "active" : "suspended",
      },
    });
  } catch (error) {
    console.error("Error updating player status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
