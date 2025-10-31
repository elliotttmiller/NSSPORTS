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

    // TODO: After Prisma regeneration, fetch actual security metrics
    // const failedLogins24h = await prisma.adminActivityLog.count({
    //   where: {
    //     action: "LOGIN",
    //     status: "failure",
    //     createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    //   }
    // });
    //
    // const activeSessions = await prisma.adminUser.count({
    //   where: {
    //     lastLogin: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) }
    //   }
    // });
    //
    // const lockedAccounts = await prisma.player.count({
    //   where: { status: "suspended" }
    // });

    return NextResponse.json({
      systemStatus: "secure",
      activeSessions: 47,
      failedLogins24h: 12,
      lockedAccounts: 3,
      lastSecurityScan: new Date().toISOString(),
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 3,
      },
    });
  } catch (error) {
    console.error("Security metrics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security metrics" },
      { status: 500 }
    );
  }
}
