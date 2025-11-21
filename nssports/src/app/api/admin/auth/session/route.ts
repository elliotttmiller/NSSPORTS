import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { JWT_SECRET } from "@/lib/adminAuth";
import { logger } from '@/lib/logger';

export async function GET() {
  logger.debug('[API /api/admin/auth/session] GET - Request received');
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    logger.debug('[API /api/admin/auth/session] All cookies', { cookies: allCookies.map(c => c.name).join(', ') });
    
    const token = cookieStore.get("admin_token")?.value;

    logger.debug('[API /api/admin/auth/session] Token present', { hasToken: !!token });
    if (token) {
      logger.debug('[API /api/admin/auth/session] Token preview', { preview: token.substring(0, 20) + '...' });
    }

    if (!token) {
      logger.debug('[API /api/admin/auth/session] No token found, returning 401');
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    logger.debug('[API /api/admin/auth/session] Verifying JWT...');
    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    logger.debug('[API /api/admin/auth/session] JWT valid', { payload });
    
    // Get admin details from database
    logger.debug('[API /api/admin/auth/session] Fetching admin from DB', { adminId: payload.adminId });
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId as string },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    logger.debug('[API /api/admin/auth/session] Admin found', { found: !!admin, status: admin?.status });

    if (!admin || admin.status !== "active") {
      logger.debug('[API /api/admin/auth/session] Admin not found or inactive, returning 401');
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    logger.debug('[API /api/admin/auth/session] Session valid, returning admin data');
    return NextResponse.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[API /api/admin/auth/session] Error", error as Error);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
