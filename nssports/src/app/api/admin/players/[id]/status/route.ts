import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    if (!["active", "suspended", "idle"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update player status
    const updatedPlayer = await prisma.dashboardPlayer.update({
      where: { id },
      data: { status },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.adminId as string,
        action: status === "active" ? "PLAYER_ACTIVATED" : "PLAYER_SUSPENDED",
        targetId: id,
        targetType: "player",
        details: {
          username: updatedPlayer.username,
          newStatus: status,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ 
      success: true,
      player: {
        id: updatedPlayer.id,
        username: updatedPlayer.username,
        status: updatedPlayer.status,
      },
    });
  } catch (error) {
    console.error("Player status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

