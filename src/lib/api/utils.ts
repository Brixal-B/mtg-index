/**
 * API Utility Functions
 * Shared utilities for API route handling
 */

import { NextRequest, NextResponse } from 'next/server';
import type { APIResponse, APIError } from './types';
import { APIErrorCode, HTTPStatus } from './types';

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate processing time
 */
export function calculateProcessingTime(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Create standardized API error
 */
export function createAPIError(
  message: string,
  code: APIErrorCode,
  status: HTTPStatus,
  details?: any
): APIError {
  return {
    message,
    code,
    status,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<{ total: number; page: number; hasMore: boolean; cached: boolean; requestId: string; processingTime: number }>
): APIResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create error response
 */
export function createErrorResponse(error: APIError): APIResponse {
  return {
    success: false,
    error,
  };
}

/**
 * Send JSON response with proper headers
 */
export function sendResponse<T>(
  response: APIResponse<T>,
  status: HTTPStatus = HTTPStatus.OK,
  cacheMaxAge?: number,
  staleWhileRevalidate?: number
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add cache headers if specified
  if (cacheMaxAge !== undefined) {
    const cacheControl = [
      'public',
      `s-maxage=${cacheMaxAge}`,
      staleWhileRevalidate !== undefined ? `stale-while-revalidate=${staleWhileRevalidate}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    
    headers['Cache-Control'] = cacheControl;
  }

  return NextResponse.json(response, { status, headers });
}

/**
 * Parse and validate search parameters
 */
export function parseSearchParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Validate required parameters
 */
export function validateRequiredParams(
  params: Record<string, string>,
  required: readonly string[]
): APIError | null {
  for (const param of required) {
    if (!params[param] || params[param].trim() === '') {
      return createAPIError(
        `Missing required parameter: ${param}`,
        APIErrorCode.INVALID_REQUEST,
        HTTPStatus.BAD_REQUEST,
        { missingParam: param }
      );
    }
  }
  
  return null;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS protection
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!input) return defaultValue;
  
  const num = parseInt(input, 10);
  if (isNaN(num)) return defaultValue;
  
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  
  return num;
}

/**
 * Log API request for debugging
 */
export function logAPIRequest(
  method: string,
  endpoint: string,
  params: Record<string, string>,
  requestId: string,
  startTime: number
): void {
  console.log(`[API] ${requestId} ${method} ${endpoint}`, {
    params,
    timestamp: new Date().toISOString(),
    startTime,
  });
}

/**
 * Log API response for debugging
 */
export function logAPIResponse(
  requestId: string,
  success: boolean,
  processingTime: number,
  error?: APIError
): void {
  const logData = {
    requestId,
    success,
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    console.error(`[API] ${requestId} Error:`, { ...logData, error });
  } else {
    console.log(`[API] ${requestId} Success:`, logData);
  }
}

/**
 * Handle async route with unified error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      logAPIRequest(
        request.method,
        request.nextUrl.pathname,
        parseSearchParams(request),
        requestId,
        startTime
      );
      
      const response = await handler(request, ...args);
      
      logAPIResponse(requestId, true, calculateProcessingTime(startTime));
      
      return response;
    } catch (error) {
      const apiError = error instanceof Error 
        ? createAPIError(
            error.message,
            APIErrorCode.INTERNAL_ERROR,
            HTTPStatus.INTERNAL_SERVER_ERROR,
            { stack: error.stack }
          )
        : createAPIError(
            'Unknown error occurred',
            APIErrorCode.INTERNAL_ERROR,
            HTTPStatus.INTERNAL_SERVER_ERROR
          );
      
      logAPIResponse(requestId, false, calculateProcessingTime(startTime), apiError);
      
      return sendResponse(createErrorResponse(apiError), apiError.status);
    }
  };
}
