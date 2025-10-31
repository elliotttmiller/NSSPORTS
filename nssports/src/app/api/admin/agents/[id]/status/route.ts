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

    // Update agent status
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: { status },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.adminId as string,
        action: status === "active" ? "AGENT_ACTIVATED" : "AGENT_SUSPENDED",
        targetId: id,
        targetType: "agent",
        details: {
          username: updatedAgent.username,
          newStatus: status,
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ 
      success: true,
      agent: {
        id: updatedAgent.id,
        username: updatedAgent.username,
        status: updatedAgent.status,
      },
    });
  } catch (error) {
    console.error("Agent status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
