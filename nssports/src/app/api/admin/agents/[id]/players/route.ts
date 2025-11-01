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
 * Get all players for a specific agent
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: agentId } = await params;

    // Fetch agent's players
    const players = await prisma.dashboardPlayer.findMany({
      where: {
        agentId: agentId,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        balance: true,
        status: true,
        totalBets: true,
        totalWagered: true,
        totalWinnings: true,
        lastBetAt: true,
        registeredAt: true,
        lastLogin: true,
      },
      orderBy: {
        registeredAt: "desc",
      },
    });

    return NextResponse.json({
      players,
      count: players.length,
    });
  } catch (error) {
    console.error("Error fetching agent players:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
