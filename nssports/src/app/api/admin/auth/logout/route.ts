import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token) {
      try {
        // Verify and get admin ID from token
        const { payload } = await jwtVerify(token, JWT_SECRET);
        
        // Log logout activity
        await prisma.adminActivityLog.create({
          data: {
            adminUserId: payload.adminId as string,
            action: "LOGOUT",
            details: {},
          },
        });
      } catch (error) {
        // Token invalid, continue with logout
        console.error("Logout token verification error:", error);
      }
    }

    // Clear the admin cookie
    cookieStore.delete("admin_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
