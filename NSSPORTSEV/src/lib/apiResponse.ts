import { NextResponse } from 'next/server';
import { logger } from './logger';
import { UnauthorizedError } from './errors';

/**
 * Standardized API response utilities following Next.js best practices
 * 
 * Backend for Frontend (BFF) Pattern:
 * - Consistent response structure across all endpoints
 * - Proper error handling and status codes
 * - Type-safe responses with TypeScript
 * - Structured error logging
 * - Request/response metadata
 * 
 * Reference: https://nextjs.org/docs/app/guides/backend-for-frontend
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response with optimized caching headers
 * 
 * OPTIMIZATION: Adds intelligent cache control headers based on data type
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>,
  cacheOptions?: {
    maxAge?: number;      // Browser cache duration in seconds
    sMaxAge?: number;     // CDN cache duration in seconds
    staleWhileRevalidate?: number;  // Allow stale content while revalidating
  }
): NextResponse<ApiSuccessResponse<T>> {
  const responseData: ApiSuccessResponse<T> = {
    success: true as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  
  const response = NextResponse.json(responseData, { status });
  
  // ✅ OPTIMIZATION: Add cache control headers for better browser/CDN caching
  if (cacheOptions) {
    const { maxAge = 0, sMaxAge = 0, staleWhileRevalidate = 0 } = cacheOptions;
    const cacheControl = [
      maxAge > 0 ? `max-age=${maxAge}` : 'no-cache',
      sMaxAge > 0 ? `s-maxage=${sMaxAge}` : '',
      staleWhileRevalidate > 0 ? `stale-while-revalidate=${staleWhileRevalidate}` : '',
    ].filter(Boolean).join(', ');
    
    response.headers.set('Cache-Control', cacheControl);
    
    // Add ETag for conditional requests (304 Not Modified)
    const etag = `W/"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 27)}"`;
    response.headers.set('ETag', etag);
  }
  
  return response;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  logger.error('API Error', new Error(message), { status, code, details });
  
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const ApiErrors = {
  badRequest: (message: string = 'Bad Request', details?: unknown) =>
    errorResponse(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message: string = 'Unauthorized') =>
    errorResponse(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message: string = 'Forbidden') =>
    errorResponse(message, 403, 'FORBIDDEN'),
  
  notFound: (message: string = 'Resource not found') =>
    errorResponse(message, 404, 'NOT_FOUND'),
  
  conflict: (message: string = 'Conflict', details?: unknown) =>
    errorResponse(message, 409, 'CONFLICT', details),
  
  unprocessable: (message: string = 'Unprocessable Entity', details?: unknown) =>
    errorResponse(message, 422, 'UNPROCESSABLE_ENTITY', details),
  
  internal: (message: string = 'Internal Server Error') =>
    errorResponse(message, 500, 'INTERNAL_SERVER_ERROR'),
  
  serviceUnavailable: (message: string = 'Service Unavailable') =>
    errorResponse(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Safely handle async API route handlers with error catching
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      return ApiErrors.unauthorized();
    }
    logger.error('Unhandled error in API route', error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  });
}
