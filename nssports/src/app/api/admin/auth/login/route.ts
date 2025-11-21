import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { JWT_SECRET } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  logger.debug('[API /api/admin/auth/login] POST - Request received');
  try {
    const { username, password } = await request.json();
    logger.debug('[API /api/admin/auth/login] Login attempt for username:', username);

    if (!username || !password) {
      logger.debug('[API /api/admin/auth/login] Missing username or password');
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find admin user in database
    logger.debug('[API /api/admin/auth/login] Looking up admin in database...');
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

    logger.debug('[API /api/admin/auth/login] Admin found', { found: !!admin, status: admin?.status });

    if (!admin) {
      logger.debug('[API /api/admin/auth/login] Admin not found');
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (admin.status !== "active") {
      logger.debug('[API /api/admin/auth/login] Admin account is suspended');
      return NextResponse.json(
        { error: "Account is suspended" },
        { status: 403 }
      );
    }

    // Verify password
    logger.debug('[API /api/admin/auth/login] Verifying password...');
    const isValidPassword = await bcrypt.compare(password, admin.password);
    logger.debug('[API /api/admin/auth/login] Password valid', { isValidPassword });
    
    if (!isValidPassword) {
      logger.debug('[API /api/admin/auth/login] Invalid password');
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT token
    logger.debug('[API /api/admin/auth/login] Creating JWT token...');
    const token = await new SignJWT({ 
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    logger.debug('[API /api/admin/auth/login] JWT token created, setting cookie...');
    
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
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax", // Lax for dev, none for prod
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    logger.debug('[API /api/admin/auth/login] Cookie set in response headers:', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
      path: '/',
      maxAge: 60 * 60 * 8
    });

    // Log login activity
    logger.debug('[API /api/admin/auth/login] Logging activity...');
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
    logger.debug('[API /api/admin/auth/login] Updating last login...');
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { 
        lastLogin: new Date(),
        loginAttempts: 0,
      },
    });

    logger.debug('[API /api/admin/auth/login] Login successful, returning response with cookie');
    return response;
  } catch (error) {
    logger.error("[API /api/admin/auth/login] Error", { data: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
