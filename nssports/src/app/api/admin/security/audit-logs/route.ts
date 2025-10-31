import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // TODO: After Prisma regeneration, fetch actual audit logs
    // const logs = await prisma.adminActivityLog.findMany({
    //   take: limit,
    //   orderBy: { createdAt: 'desc' },
    //   include: {
    //     adminUser: {
    //       select: { username: true, role: true }
    //     }
    //   }
    // });

    // Mock audit log data
    const mockLogs = [
      {
        id: "log_1",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        user: "admin",
        role: "super_admin",
        action: "LOGIN",
        resource: "Auth",
        ipAddress: "192.168.1.100",
        status: "success",
        details: "Successful admin login",
      },
      {
        id: "log_2",
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        user: "lisa_ops",
        role: "agent",
        action: "BALANCE_ADJUSTMENT",
        resource: "Player:sara_player",
        ipAddress: "192.168.1.105",
        status: "success",
        details: "Deposited $500",
      },
      {
        id: "log_3",
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        user: "john_smith",
        role: "agent",
        action: "LOGIN",
        resource: "Auth",
        ipAddress: "192.168.1.110",
        status: "failure",
        details: "Invalid credentials",
      },
      {
        id: "log_4",
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        user: "admin",
        role: "super_admin",
        action: "CONFIG_UPDATE",
        resource: "Config:agentDefaults",
        ipAddress: "192.168.1.100",
        status: "success",
        details: "Updated agent default limits",
      },
      {
        id: "log_5",
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        user: "mark_t",
        role: "agent",
        action: "BALANCE_ADJUSTMENT",
        resource: "Player:mike_2024",
        ipAddress: "192.168.1.115",
        status: "warning",
        details: "Adjustment exceeded single transaction limit",
      },
      {
        id: "log_6",
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        user: "admin",
        role: "super_admin",
        action: "AGENT_CREATE",
        resource: "Agent:new_agent",
        ipAddress: "192.168.1.100",
        status: "success",
        details: "Created new agent account",
      },
      {
        id: "log_7",
        timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
        user: "lisa_ops",
        role: "agent",
        action: "PLAYER_STATUS_UPDATE",
        resource: "Player:tom_bets",
        ipAddress: "192.168.1.105",
        status: "success",
        details: "Changed status to active",
      },
      {
        id: "log_8",
        timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        user: "unknown",
        role: "unknown",
        action: "LOGIN",
        resource: "Auth",
        ipAddress: "203.0.113.42",
        status: "failure",
        details: "Multiple failed login attempts",
      },
    ];

    return NextResponse.json({
      logs: mockLogs,
      total: mockLogs.length,
      limit,
    });
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
