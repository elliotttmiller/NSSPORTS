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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response
    const formattedAgents = agents.map((agent) => ({
      id: agent.id,
      username: agent.username,
      displayName: agent.displayName,
      status: agent.status,
      lastLogin: agent.lastLogin?.toISOString() || null,
      maxSingleAdjustment: agent.maxSingleAdjustment,
      dailyAdjustmentLimit: agent.dailyAdjustmentLimit,
      playerCount: agent._count.players,
      todayAdjustments: agent.currentDailyTotal,
      createdAt: agent.createdAt.toISOString(),
    }));

    return NextResponse.json({ agents: formattedAgents });
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

    // Check if username already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { username },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create agent in database
    const newAgent = await prisma.agent.create({
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
