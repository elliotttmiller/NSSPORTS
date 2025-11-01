import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

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

// GET - List all players
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch players with agent information
    const players = await prisma.dashboardPlayer.findMany({
      include: {
        agent: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
    });

    // Format response
    const formattedPlayers = players.map((player) => ({
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      agentUsername: player.agent?.username || null,
      agentDisplayName: player.agent?.displayName || null,
      status: player.status,
      balance: player.balance,
      totalBets: player.totalBets,
      lastBetAt: player.lastBetAt?.toISOString() || null,
      registeredAt: player.registeredAt.toISOString(),
    }));

    return NextResponse.json({ players: formattedPlayers });
  } catch (error) {
    console.error("Players fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new player
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      username,
      displayName,
      password,
      agentId,
      balance,
      bettingLimits,
    } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingPlayer = await prisma.dashboardPlayer.findUnique({
      where: { username },
    });

    if (existingPlayer) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create player in BOTH tables (DashboardPlayer for admin, User for NextAuth login)
    // Use transaction to ensure both are created or neither
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create in DashboardPlayer table (for admin dashboard)
      const newPlayer = await tx.dashboardPlayer.create({
        data: {
          username,
          displayName: displayName || username,
          password: hashedPassword,
          agentId: agentId || null,
          balance: balance || 0,
          bettingLimits: bettingLimits || {
            maxBetAmount: 10000,
            maxDailyBets: 50,
            minBetAmount: 5,
          },
          status: "active",
        },
        include: {
          agent: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      // 2. Create in User table (for NextAuth login)
      await tx.user.create({
        data: {
          username,
          name: displayName || username,
          password: hashedPassword,
          userType: "player",
          isActive: true,
          parentAgentId: agentId || null,
          createdBy: admin.adminId as string,
        },
      });

      return newPlayer;
    });

    const newPlayer = result;

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.adminId as string,
        action: "CREATE_PLAYER",
        targetId: newPlayer.id,
        targetType: "player",
        details: {
          username: newPlayer.username,
          displayName: newPlayer.displayName,
          agentId: newPlayer.agentId,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      player: {
        id: newPlayer.id,
        username: newPlayer.username,
        displayName: newPlayer.displayName,
        agentUsername: newPlayer.agent?.username || null,
        status: newPlayer.status,
        balance: newPlayer.balance,
        registeredAt: newPlayer.registeredAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Player creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
