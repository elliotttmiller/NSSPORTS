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
 * - Redirects first-time/unauthenticated users to login
 * 
 * Reference: https://nextjs.org/docs/app/guides/authentication
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/welcome'];

// Protected routes that require authentication (everything else)
const PROTECTED_ROUTES = ['/', '/my-bets', '/account', '/games', '/live'];
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
  
  // Skip NextAuth routes and public API routes
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/games') ||
      pathname.startsWith('/api/live') ||
      pathname.startsWith('/api/sports') ||
      pathname.startsWith('/api/matches') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Allow public routes (login, register, welcome)
  const isPublicRoute = pathname === '/auth/login' || 
                        pathname === '/auth/register' || 
                        pathname === '/welcome';

  // Check authentication for all non-public routes
  const isProtectedPage = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedApi = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  
  // For protected routes or root path, check authentication
  if ((isProtectedPage || isProtectedApi || pathname === '/') && !isPublicRoute) {
    const session = await auth();
    
    if (!session) {
      // Redirect to login for protected pages
      if (isProtectedPage || pathname === '/') {
        const loginUrl = new URL('/auth/login', request.url);
        if (pathname !== '/') {
          loginUrl.searchParams.set('callbackUrl', pathname);
        }
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
// Include all routes to ensure proper authentication checks
export const config = {
  matcher: [
    '/',
    '/games/:path*',
    '/live/:path*',
    '/my-bets/:path*',
    '/account/:path*',
    '/api/:path*',
  ],
};
