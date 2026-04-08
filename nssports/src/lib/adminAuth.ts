// Admin auth disabled for static export - uses client-side only
import { NextRequest } from 'next/server';

export const JWT_SECRET = new TextEncoder().encode('static-export-placeholder');

export interface AdminJWTPayload {
  adminId: string;
  username: string;
  role: 'superadmin' | 'admin';
}

export async function verifyAdminToken(_request: NextRequest): Promise<AdminJWTPayload | null> {
  return null;
}

export async function createAdminToken(_payload: AdminJWTPayload): Promise<string> {
  return '';
}
