/**
 * ErrorHandler Middleware - 표준화된 에러 처리
 * TypeScript 변환: Express + 타입 안전성 + 구조화된 응답
 */

import express from 'express';
import logger from '../monitoring/logger';

// Types
export interface APIErrorDetails {
  field?: string;
  value?: any;
  message?: string;
  code?: string;
}

export interface APIResponseMeta {
  timestamp: number;
  responseTime?: number;
  requestId?: string;
  stack?: string;
  details?: APIErrorDetails | APIErrorDetails[];
}

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta: APIResponseMeta;
}

/**
 * Standardized API Error class
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: APIErrorDetails | APIErrorDetails[] | null;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details: APIErrorDetails | APIErrorDetails[] | null = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'APIError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Standard success response formatter
 */
export function successResponse<T = any>(
  data: T | null = null,
  meta: Partial<APIResponseMeta> = {}
): StandardResponse<T> {
  return {
    success: true,
    data: data ?? undefined,
    meta: {
      timestamp: Date.now(),
      ...meta
    }
  };
}

/**
 * Standard error response formatter
 */
export function errorResponse(
  error: string | Error,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  meta: Partial<APIResponseMeta> = {}
): StandardResponse<never> {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message,
    code,
    meta: {
      timestamp: Date.now(),
      ...meta
    }
  };
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const startTime = (req as any)._startTime || Date.now();
  const duration = Date.now() - startTime;
  
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'Internal server error';
  let errorDetails: APIErrorDetails | APIErrorDetails[] | null = null;

  // Handle different error types
  if (err instanceof APIError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    errorMessage = err.message;
    errorDetails = err.details;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Authentication failed';
  } else if ((err as any).code === 'permission-denied') {
    statusCode = 403;
    errorCode = 'PERMISSION_DENIED';
    errorMessage = 'Access denied';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    errorMessage = 'Invalid ID format';
  }

  // Log error with context
  logger.error({
    error: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    duration,
    body: req.method !== 'GET' ? req.body : undefined
  }, 'Request failed');

  // Send standardized error response
  const response = errorResponse(
    errorMessage,
    statusCode,
    errorCode,
    {
      responseTime: duration,
      requestId: (req as any).id || `req_${Date.now()}`,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: errorDetails || undefined
      })
    }
  );

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const error = new APIError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );

  logger.warn({
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }, 'Route not found');

  next(error);
}

/**
 * Async error wrapper to catch async errors
 */
export function asyncHandler<T extends express.RequestHandler>(
  fn: T
): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request timing middleware
 */
export function requestTimer(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  (req as any)._startTime = Date.now();
  next();
}

/**
 * Validation error handler
 */
export function validateRequest(schema: { validate: (data: any) => { error?: any } }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationDetails: APIErrorDetails[] = error.details?.map((d: any) => ({
        field: d.path?.join('.'),
        message: d.message,
        value: d.context?.value
      })) || [];

      const validationError = new APIError(
        `Validation failed: ${error.details?.map((d: any) => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
        validationDetails
      );
      return next(validationError);
    }
    next();
  };
}

/**
 * Rate limit error handler
 */
export function rateLimitHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const rateLimit = (req as any).rateLimit;
  
  const error = new APIError(
    'Too many requests, please try again later',
    429,
    'RATE_LIMIT_EXCEEDED',
    {
      message: 'Rate limit exceeded',
      value: rateLimit?.limit,
      code: 'RETRY_AFTER_60'
    }
  );
  
  next(error);
}

/**
 * CORS error handler
 */
export function corsErrorHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const error = new APIError(
    'CORS policy violation',
    403,
    'CORS_ERROR',
    {
      message: 'Cross-origin request blocked',
      field: 'origin',
      value: req.get('Origin')
    }
  );
  
  next(error);
}

/**
 * Content type error handler
 */
export function contentTypeErrorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (err.message.includes('content-type')) {
    const error = new APIError(
      'Invalid content type',
      400,
      'INVALID_CONTENT_TYPE',
      {
        message: 'Expected application/json',
        field: 'content-type',
        value: req.get('Content-Type')
      }
    );
    return next(error);
  }
  next(err);
}