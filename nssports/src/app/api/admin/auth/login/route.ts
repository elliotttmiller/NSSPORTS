import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "your-admin-secret-key-change-in-production"
);

export async function POST(request: NextRequest) {
  console.log('[API /api/admin/auth/login] POST - Request received');
  try {
    const { username, password } = await request.json();
    console.log('[API /api/admin/auth/login] Login attempt for username:', username);

    if (!username || !password) {
      console.log('[API /api/admin/auth/login] Missing username or password');
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find admin user in database
    console.log('[API /api/admin/auth/login] Looking up admin in database...');
    const admin = await prisma.adminUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    console.log('[API /api/admin/auth/login] Admin found:', !!admin, 'status:', admin?.status);

    if (!admin) {
      console.log('[API /api/admin/auth/login] Admin not found');
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (admin.status !== "active") {
      console.log('[API /api/admin/auth/login] Admin account is suspended');
      return NextResponse.json(
        { error: "Account is suspended" },
        { status: 403 }
      );
    }

    // Verify password
    console.log('[API /api/admin/auth/login] Verifying password...');
    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log('[API /api/admin/auth/login] Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('[API /api/admin/auth/login] Invalid password');
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT token
    console.log('[API /api/admin/auth/login] Creating JWT token...');
    const token = await new SignJWT({ 
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    console.log('[API /api/admin/auth/login] JWT token created, setting cookie...');
    
    // Create response with admin data
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt.toISOString(),
      },
    });

    // Set HTTP-only cookie directly on response
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: true, // Required for HTTPS (ngrok)
      sameSite: "none", // Required for cross-origin (ngrok)
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    console.log('[API /api/admin/auth/login] Cookie set in response headers (secure=true, sameSite=none, path=/)');

    // Log login activity
    console.log('[API /api/admin/auth/login] Logging activity...');
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: admin.id,
        action: "LOGIN",
        targetId: null,
        targetType: null,
        details: { 
          username: admin.username,
          timestamp: new Date().toISOString()
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    });

    // Update last login
    console.log('[API /api/admin/auth/login] Updating last login...');
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { 
        lastLogin: new Date(),
        loginAttempts: 0,
      },
    });

    console.log('[API /api/admin/auth/login] Login successful, returning response with cookie');
    return response;
  } catch (error) {
    console.error("[API /api/admin/auth/login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
