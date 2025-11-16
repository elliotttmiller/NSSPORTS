import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

// GET - List all agents
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch agents with player counts and today's adjustments
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        status: true,
        lastLogin: true,
        maxSingleAdjustment: true,
        dailyAdjustmentLimit: true,
        currentDailyTotal: true,
        createdAt: true,
        _count: {
          select: {
            players: true,
          },
        },
        players: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate real-time total AVAILABLE balance for each agent from their players
    const agentsWithBalance = await Promise.all(
      agents.map(async (agent) => {
        // Get all User records for this agent's players with their bets to calculate risk
        const playerUsernames = agent.players.map(p => p.username);
        
        let totalBalance = 0;
        if (playerUsernames.length > 0) {
          const users = await prisma.user.findMany({
            where: { username: { in: playerUsernames } },
            include: {
              account: { 
                select: { balance: true } 
              },
              bets: {
                where: {
                  status: { in: ['pending', 'processing'] }
                },
                select: { 
                  stake: true 
                }
              }
            }
          });
          
          // Calculate available balance (balance - risk) for each user
          totalBalance = users.reduce((sum, user) => {
            const balance = user.account ? Number(user.account.balance) : 0;
            const risk = user.bets.reduce((riskSum: number, bet) => riskSum + Number(bet.stake), 0);
            const available = balance - risk;
            return sum + available;
          }, 0);
        }

        return {
          id: agent.id,
          username: agent.username,
          displayName: agent.displayName,
          status: agent.status,
          lastLogin: agent.lastLogin?.toISOString() || null,
          maxSingleAdjustment: agent.maxSingleAdjustment,
          dailyAdjustmentLimit: agent.dailyAdjustmentLimit,
          playerCount: agent._count.players,
          totalBalance,
          todayAdjustments: agent.currentDailyTotal,
          createdAt: agent.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ agents: agentsWithBalance });
  } catch (error) {
    console.error("Agents fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new agent
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
      maxSingleAdjustment,
      dailyAdjustmentLimit,
      canSuspendPlayers,
      commissionRate,
      ipRestriction,
      regionAssignment,
      notes,
      permissions,
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

    // Check if username already exists (with retry for connection issues)
    let existingAgent;
    try {
      existingAgent = await prisma.agent.findUnique({
        where: { username },
      });
    } catch (dbError) {
      console.error("Database connection error while checking username:", dbError);
      // Retry once after brief delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        existingAgent = await prisma.agent.findUnique({
          where: { username },
        });
      } catch (retryError) {
        console.error("Database connection retry failed:", retryError);
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }
    }

    if (existingAgent) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create agent in BOTH tables (Agent table for admin dashboard, User table for NextAuth login)
    // Use transaction to ensure both are created or neither
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create in Agent table (for admin dashboard)
      const newAgent = await tx.agent.create({
        data: {
          username,
          displayName: displayName || username,
          password: hashedPassword,
          maxSingleAdjustment: maxSingleAdjustment || 1000,
          dailyAdjustmentLimit: dailyAdjustmentLimit || 5000,
          canSuspendPlayers: canSuspendPlayers !== false,
          commissionRate,
          ipRestriction,
          regionAssignment,
          notes,
          permissions,
          createdBy: admin.adminId as string,
          status: "active",
        },
      });

      // 2. Create in User table (for NextAuth login)
      await tx.user.create({
        data: {
          username,
          name: displayName || username,
          password: hashedPassword,
          userType: "agent",
          isActive: true,
          createdBy: admin.adminId as string,
        },
      });

      return newAgent;
    });

    const newAgent = result;

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.adminId as string,
        action: "CREATE_AGENT",
        targetId: newAgent.id,
        targetType: "agent",
        details: {
          username: newAgent.username,
          displayName: newAgent.displayName,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: newAgent.id,
        username: newAgent.username,
        displayName: newAgent.displayName,
        status: newAgent.status,
        createdAt: newAgent.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Agent creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
