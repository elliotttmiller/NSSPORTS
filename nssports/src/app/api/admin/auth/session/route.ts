import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Get admin details from database
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

    if (!admin || admin.status !== "active") {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
