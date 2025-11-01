import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);

    // Fetch actual security metrics from database
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    const [
      failedLoginLogs,
      recentLoginCount,
      suspendedPlayers,
      suspendedAgents,
      totalActivityLogs,
      recentCriticalLogs
    ] = await Promise.all([
      // Count failed login attempts in last 24 hours
      prisma.adminActivityLog.count({
        where: {
          action: { in: ["LOGIN_FAILED", "FAILED_LOGIN"] },
          createdAt: { gte: twentyFourHoursAgo }
        }
      }),
      // Count active sessions (admins who logged in within last 8 hours)
      prisma.adminUser.count({
        where: {
          lastLogin: { gte: eightHoursAgo },
          status: "active"
        }
      }),
      // Count suspended/locked player accounts
      prisma.dashboardPlayer.count({
        where: { status: "suspended" }
      }),
      // Count suspended agent accounts
      prisma.agent.count({
        where: { status: "suspended" }
      }),
      // Total activity logs for analysis
      prisma.adminActivityLog.count(),
      // Recent critical actions
      prisma.adminActivityLog.count({
        where: {
          action: { in: ["SUSPEND_PLAYER", "SUSPEND_AGENT", "DELETE_USER", "CONFIG_UPDATE"] },
          createdAt: { gte: twentyFourHoursAgo }
        }
      })
    ]);

    const totalLockedAccounts = suspendedPlayers + suspendedAgents;

    // Calculate vulnerability status based on metrics
    const vulnerabilities = {
      critical: 0,
      high: failedLoginLogs > 50 ? 1 : 0, // High if excessive failed logins
      medium: totalLockedAccounts > 10 ? 1 : 0, // Medium if many suspended accounts
      low: recentCriticalLogs > 5 ? 1 : 0, // Low if many critical actions
    };

    // Determine overall system status
    let systemStatus = "secure";
    if (vulnerabilities.critical > 0) {
      systemStatus = "critical";
    } else if (vulnerabilities.high > 0) {
      systemStatus = "warning";
    } else if (failedLoginLogs > 20 || totalLockedAccounts > 5) {
      systemStatus = "monitoring";
    }

    return NextResponse.json({
      systemStatus,
      activeSessions: recentLoginCount,
      failedLogins24h: failedLoginLogs,
      lockedAccounts: totalLockedAccounts,
      lastSecurityScan: new Date().toISOString(),
      vulnerabilities,
      metrics: {
        totalActivityLogs,
        recentCriticalActions: recentCriticalLogs,
        suspendedPlayers,
        suspendedAgents,
      }
    });
  } catch (error) {
    console.error("Security metrics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security metrics" },
      { status: 500 }
    );
  }
}
