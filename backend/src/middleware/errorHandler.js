const logger = require('../monitoring/logger');

/**
 * Standardized error response format
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'APIError';
  }
}

/**
 * Standard success response formatter
 */
function successResponse(data = null, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      ...meta
    }
  };
}

/**
 * Standard error response formatter
 */
function errorResponse(error, statusCode = 500, code = 'INTERNAL_ERROR', meta = {}) {
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
function globalErrorHandler(err, req, res, next) {
  const startTime = req._startTime || Date.now();
  const duration = Date.now() - startTime;
  
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'Internal server error';
  let errorDetails = null;

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
  } else if (err.code === 'permission-denied') {
    statusCode = 403;
    errorCode = 'PERMISSION_DENIED';
    errorMessage = 'Access denied';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    errorMessage = 'Invalid ID format';
  }

  // Log error with context
  logger.error('Request failed', {
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
  });

  // Send standardized error response
  res.status(statusCode).json(errorResponse(
    errorMessage,
    statusCode,
    errorCode,
    {
      responseTime: duration,
      requestId: req.id || `req_${Date.now()}`,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: errorDetails 
      })
    }
  ));
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const startTime = req._startTime || Date.now();
  const error = new APIError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );

  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next(error);
}

/**
 * Async error wrapper to catch async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request timing middleware
 */
function requestTimer(req, res, next) {
  req._startTime = Date.now();
  next();
}

/**
 * Validation error handler
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError = new APIError(
        `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
        error.details
      );
      return next(validationError);
    }
    next();
  };
}

/**
 * Rate limit error handler
 */
function rateLimitHandler(req, res, next) {
  const error = new APIError(
    'Too many requests, please try again later',
    429,
    'RATE_LIMIT_EXCEEDED',
    {
      retryAfter: 60,
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      resetTime: req.rateLimit?.resetTime
    }
  );
  next(error);
}

module.exports = {
  APIError,
  successResponse,
  errorResponse,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  requestTimer,
  validateRequest,
  rateLimitHandler
};