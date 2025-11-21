import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

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

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch real recent activities from database
    const recentLogs = await prisma.adminActivityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { username: true, role: true }
        }
      }
    });

    // Transform logs into activity items with appropriate icons and messages
    const activities = recentLogs.map(log => {
      const time = new Date(log.createdAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      let type = "system";
      let icon = "info";
      let message = `${log.admin.username} performed ${log.action}`;

      // Customize based on action type
      switch (log.action) {
        case "LOGIN":
          type = "system";
          icon = "user";
          message = `Admin "${log.admin.username}" logged in`;
          break;
        case "LOGOUT":
          type = "system";
          icon = "user";
          message = `Admin "${log.admin.username}" logged out`;
          break;
        case "CREATE_AGENT":
          type = "agent";
          icon = "user";
          message = `Admin "${log.admin.username}" created new agent`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "SUSPEND_AGENT":
          type = "agent";
          icon = "ban";
          message = `Admin "${log.admin.username}" suspended agent`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "ACTIVATE_AGENT":
          type = "agent";
          icon = "check";
          message = `Admin "${log.admin.username}" activated agent`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "CREATE_PLAYER":
          type = "player";
          icon = "user";
          message = `Admin "${log.admin.username}" registered new player`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "SUSPEND_PLAYER":
          type = "player";
          icon = "ban";
          message = `Admin "${log.admin.username}" suspended player`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "ACTIVATE_PLAYER":
          type = "player";
          icon = "check";
          message = `Admin "${log.admin.username}" activated player`;
          if (log.targetId) message += ` "${log.targetId}"`;
          break;
        case "BALANCE_ADJUSTMENT":
          type = "player";
          icon = "dollar";
          const details = log.details as { amount?: number; reason?: string } | null;
          const amount = details && typeof details === 'object' && 'amount' in details ? details.amount : '';
          message = `Admin "${log.admin.username}" adjusted balance`;
          if (amount) message += ` ${amount > 0 ? '+' : ''}$${Math.abs(Number(amount))}`;
          if (log.targetId) message += ` for "${log.targetId}"`;
          break;
        case "CONFIG_UPDATE":
          type = "system";
          icon = "settings";
          message = `Admin "${log.admin.username}" updated system configuration`;
          break;
        default:
          type = "system";
          icon = "info";
          message = `Admin "${log.admin.username}" performed ${log.action}`;
      }

      return {
        id: log.id,
        time,
        type,
        message,
        icon,
      };
    });

    return NextResponse.json({ activities });
  } catch (error) {
    logger.error("Activity fetch error", { data: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
