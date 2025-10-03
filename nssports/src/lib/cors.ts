import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Get allowed origins from environment variable
// Default to localhost and ngrok URL for development
const getAllowedOrigins = (): string[] => {
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
};

// CORS configuration following industry best practices
export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // Create response with CORS headers
  const response = NextResponse.next();
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development' && origin) {
    // In development, allow all origins for easier testing
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  // Set other CORS headers
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

// Handle preflight requests
export function handlePreflight(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  const preflightResponse = new NextResponse(null, { status: 204 });
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development' && origin) {
    preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  preflightResponse.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  preflightResponse.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  preflightResponse.headers.set('Access-Control-Max-Age', '86400');
  
  return preflightResponse;
}
