/**
 * Health Check Endpoint
 * ────────────────────────────────────────────────────────────────
 * Lightweight endpoint for system health checks and startup verification
 * 
 * This endpoint is used by:
 * - Start script to verify server is ready
 * - Monitoring tools to check system health
 * - Load balancers for health checks
 * 
 * @returns JSON with status and timestamp
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health
 * 
 * Simple health check endpoint that responds quickly without
 * dependencies on database or external services.
 * 
 * Used for:
 * - Startup verification in scripts/start.py
 * - Ngrok tunnel health checks
 * - Monitoring and uptime checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nssports',
    environment: process.env.NODE_ENV || 'development',
  });
}

/**
 * HEAD /api/health
 * 
 * Even lighter weight check - returns headers only
 * Useful for quick connectivity tests
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Service-Status': 'ok',
    },
  });
}
