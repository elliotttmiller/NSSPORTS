/**
 * Admin JWT Authentication Utilities
 * Handles JWT token verification for admin routes
 */

import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Centralized JWT secret - exported so all admin auth files use the same secret
export const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key-change-in-production'
);

export interface AdminJWTPayload {
  adminId: string;
  username: string;
  role: 'superadmin' | 'admin';
}

/**
 * Verify admin JWT token from request cookies
 * @param request NextRequest object
 * @returns Admin data if valid, null if invalid
 */
export async function verifyAdminToken(request: NextRequest): Promise<AdminJWTPayload | null> {
  try {
    const token = request.cookies.get('admin_token')?.value;
    
    if (!token) {
      logger.info('[verifyAdminToken] No admin_token cookie found');
      return null;
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    logger.info('[verifyAdminToken] Token valid, payload:', payload);
    
    // Type assertion with validation
    if (!payload.adminId || !payload.username || !payload.role) {
      logger.info('[verifyAdminToken] Invalid payload structure');
      return null;
    }
    
    return payload as unknown as AdminJWTPayload;
  } catch (error) {
    logger.error('[verifyAdminToken] Token verification failed:', error);
    return null;
  }
}

/**
 * Get authenticated admin from request
 * Verifies token and fetches admin data from database
 * @param request NextRequest object
 * @returns Admin user data if valid, null if invalid
 */
export async function getAdminUser(request: NextRequest) {
  logger.info('[getAdminUser] Starting admin authentication check');
  
  const payload = await verifyAdminToken(request);
  
  if (!payload) {
    logger.info('[getAdminUser] No valid token payload');
    return null;
  }

  logger.debug('[getAdminUser] Token payload valid, fetching admin from DB', { adminId: payload.adminId });

  // Fetch admin from database
  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  if (!admin || admin.status !== 'active') {
    logger.debug('[getAdminUser] Admin not found or inactive', { admin });
    return null;
  }

  logger.debug('[getAdminUser] Admin authenticated successfully', { username: admin.username });
  return admin;
}

/**
 * Create admin JWT token
 * @param adminId Admin ID
 * @param username Admin username
 * @param role Admin role
 * @returns JWT token string
 */
export async function createAdminToken(
  adminId: string,
  username: string,
  role: 'superadmin' | 'admin'
): Promise<string> {
  const token = await new SignJWT({
    adminId,
    username,
    role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}
