import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Next.js Middleware for CORS, Request Handling, and Authentication
 * Runs before every request to API routes and protected pages
 * 
 * Uses Node.js runtime to support Prisma and bcryptjs for authentication
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

// Force Node.js runtime (required for Prisma/bcryptjs)
export const runtime = 'nodejs';

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
  
  console.log('[Middleware] Request to:', pathname);
  
  // ============================================================
  // 🔹 STEP 1: BYPASS - Static Assets & Internal Routes
  // ============================================================
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/icon.') ||
      pathname.startsWith('/apple-') ||
      pathname.startsWith('/manifest.') ||
      pathname.startsWith('/sw.') ||
      pathname.startsWith('/public') ||
      pathname.startsWith('/logos/') ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next();
  }

  // ============================================================
  // 🔹 STEP 2: ADMIN AUTH SYSTEM - Separate from NextAuth
  // ============================================================
  // Admin routes use custom JWT authentication (admin_token cookie)
  // Completely isolated from user/agent NextAuth system
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    console.log('[Middleware] 🔐 Admin route - using custom JWT auth system');
    
    // Public admin routes (no auth required)
    const isAdminLoginPage = pathname === '/admin/login' || pathname === '/admin';
    const isAdminAuthAPI = pathname.startsWith('/api/admin/auth');
    
    if (isAdminLoginPage || isAdminAuthAPI) {
      console.log('[Middleware] ✅ Admin public route, allowing access');
      return NextResponse.next();
    }
    
    // Protected admin routes - check for admin_token cookie
    const adminToken = request.cookies.get('admin_token');
    
    if (!adminToken) {
      console.log('[Middleware] ❌ No admin token, redirecting to /admin/login');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    console.log('[Middleware] ✅ Admin token found, allowing access');
    return NextResponse.next();
  }

  // ============================================================
  // 🔹 STEP 3: USER/AGENT AUTH SYSTEM - NextAuth (JWT Sessions)
  // ============================================================
  // User and agent routes use NextAuth with JWT sessions
  console.log('[Middleware] 👤 User/Agent route - using NextAuth system');
  
  // Define public routes (no auth required)
  const PUBLIC_ROUTES = [
    '/auth/login',
    '/auth/register', 
    '/welcome',
    '/api/auth', // NextAuth API routes
  ];

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  
  // Public API routes that don't require authentication
  const isPublicApi = pathname.startsWith('/api/games') ||
                      pathname.startsWith('/api/live') ||
                      pathname.startsWith('/api/sports') ||
                      pathname.startsWith('/api/matches') ||
                      pathname.startsWith('/api/player-props') ||
                      pathname.startsWith('/api/game-props') ||
                      pathname.startsWith('/api/health'); // Health check endpoint

  // Skip auth check for public routes and public APIs
  if (isPublicRoute || isPublicApi) {
    console.log('[Middleware] ✅ Public route, allowing access');
    return NextResponse.next();
  }

  // ⚠️ STRICT AUTHENTICATION CHECK - All other routes require NextAuth session
  const session = await auth();
  
  console.log('[Middleware] Session check - pathname:', pathname, 'hasSession:', !!session);
  
  if (!session || !session.user) {
    console.log('[Middleware] ❌ No NextAuth session, redirecting to /auth/login');
    // Block API routes with 401
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Redirect ALL page requests to login (including root /)
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/' && pathname !== '/auth/login') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    console.log('[Middleware] Redirecting to:', loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  // 🔐 ROLE-BASED ACCESS CONTROL
  const isAgent = session.user.isAgent || session.user.isAdmin;
  const isAgentRoute = pathname.startsWith('/agent');
  
  // Players cannot access /agent routes
  if (!isAgent && isAgentRoute) {
    console.log('[Middleware] Player trying to access agent route, redirecting to /');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // User is authenticated - allow access
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
export const config = {
  matcher: [
    /*
     * Match all request paths including root
     * Exclude: _next/static, _next/image, favicon, and static files
     */
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
