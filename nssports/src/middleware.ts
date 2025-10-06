import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Next.js Middleware for CORS, Request Handling, and Authentication
 * Runs before every request to API routes and protected pages
 * 
 * Official Next.js Best Practices:
 * - Validates allowed origins
 * - Handles preflight OPTIONS requests
 * - Sets proper CORS headers
 * - Supports credentials
 * - Protects authenticated routes
 * 
 * Reference: https://nextjs.org/docs/app/guides/authentication
 */

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/', '/my-bets', '/account'];
const PROTECTED_API_ROUTES = ['/api/my-bets', '/api/account'];

// Get allowed origins from environment variable
function getAllowedOrigins(): string[] {
  const originsEnv = process.env.ALLOWED_ORIGINS;
  
  if (originsEnv) {
    return originsEnv.split(',').map(origin => origin.trim());
  }
  
  // Default allowed origins for development
  return [
    'http://localhost:3000',
    'http://nssportsclub.ngrok.app',
    'https://nssportsclub.ngrok.app',
  ];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip NextAuth routes, public API routes, and public pages explicitly
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/auth/') || 
      pathname === '/welcome' ||
      pathname.startsWith('/api/games') ||
      pathname.startsWith('/api/live') ||
      pathname.startsWith('/api/matches')) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const isProtectedPage = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedApi = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedPage || isProtectedApi) {
    const session = await auth();
    
    if (!session) {
      // Redirect to login for protected pages
      if (isProtectedPage) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Return 401 for protected API routes
      if (isProtectedApi) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  }

  // Get origin from request
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    
    // Set CORS headers for preflight
    if (origin && allowedOrigins.includes(origin)) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development' && origin) {
      // In development, allow all origins
      preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    preflightResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    preflightResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Idempotency-Key'
    );
    preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    preflightResponse.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    
    return preflightResponse;
  }
  
  // Continue with the request and add CORS headers to response
  const response = NextResponse.next();
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development' && origin) {
    // In development, allow all origins
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Idempotency-Key'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

// Configure which paths the middleware runs on
// Include both API routes and protected pages
export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/my-bets/:path*',
    '/account/:path*',
  ],
};
