import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Standardized API response utilities following Next.js best practices
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
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
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
  handler: () => Promise<NextResponse<ApiSuccessResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error: unknown) => {
    logger.error('Unhandled error in API route', error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  });
}
