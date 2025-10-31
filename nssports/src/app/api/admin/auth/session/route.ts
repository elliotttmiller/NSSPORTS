import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function GET() {
  console.log('[API /api/admin/auth/session] GET - Request received');
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[API /api/admin/auth/session] All cookies:', allCookies.map(c => c.name).join(', '));
    
    const token = cookieStore.get("admin_token")?.value;

    console.log('[API /api/admin/auth/session] Token present:', !!token);
    if (token) {
      console.log('[API /api/admin/auth/session] Token preview:', token.substring(0, 20) + '...');
    }

    if (!token) {
      console.log('[API /api/admin/auth/session] No token found, returning 401');
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log('[API /api/admin/auth/session] Verifying JWT...');
    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[API /api/admin/auth/session] JWT valid, payload:', payload);
    
    // Get admin details from database
    console.log('[API /api/admin/auth/session] Fetching admin from DB, adminId:', payload.adminId);
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

    console.log('[API /api/admin/auth/session] Admin found:', !!admin, 'status:', admin?.status);

    if (!admin || admin.status !== "active") {
      console.log('[API /api/admin/auth/session] Admin not found or inactive, returning 401');
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    console.log('[API /api/admin/auth/session] Session valid, returning admin data');
    return NextResponse.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[API /api/admin/auth/session] Error:", error);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
