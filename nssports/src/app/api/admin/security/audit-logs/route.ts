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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action"); // Optional filter by action type
    const targetType = searchParams.get("targetType"); // Optional filter by target type

    // Build where clause for filtering
    const where: {
      action?: string;
      targetType?: string;
    } = {};
    
    if (action) {
      where.action = action;
    }
    if (targetType) {
      where.targetType = targetType;
    }

    // Fetch real audit logs from database
    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { 
              username: true, 
              role: true 
            }
          }
        }
      }),
      prisma.adminActivityLog.count({ where })
    ]);

    // Transform logs to match frontend expectations
    const transformedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      user: log.admin.username,
      role: log.admin.role,
      action: log.action,
      resource: log.targetType && log.targetId ? `${log.targetType}:${log.targetId}` : log.targetType || "System",
      ipAddress: log.ipAddress || "Unknown",
      status: "success", // Logged actions are typically successful; failures can be determined from action type
      details: typeof log.details === 'object' && log.details !== null 
        ? JSON.stringify(log.details) 
        : String(log.details || ""),
    }));

    return NextResponse.json({
      logs: transformedLogs,
      total,
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
