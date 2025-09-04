/**
 * Enhanced Logging System - Request ID + Performance Monitoring
 * @description 요청 추적, 성능 모니터링, 구조화된 로깅
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Enhanced logger configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: () => ({
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'localhost',
      service: 'dasi-backend'
    })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  },
  // Pretty print in development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined
});

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: pino.Logger;
      startTime: number;
    }
  }
}

/**
 * Request ID middleware - 모든 요청에 고유 ID 할당
 */
export const requestIdMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // Generate unique request ID
  const requestId = req.get('X-Request-ID') || uuidv4();
  
  // Store in request
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Create child logger with request context
  req.logger = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Log request start
  req.logger.info({
    type: 'request_start',
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  }, `→ ${req.method} ${req.originalUrl}`);

  next();
};

/**
 * Performance Budget configuration
 */
const PERFORMANCE_BUDGETS: Record<string, number> = {
  // API endpoints (in milliseconds)
  '/api/v2/cards': 200,
  '/api/v2/cards/:id': 100,
  '/api/sessions': 500,
  '/api/sessions/start': 800,
  '/api/feedback': 1000,
  '/api/users': 300,
  '/docs': 100,
  '/health': 50,
  '/metrics': 100,
  
  // Default budgets by method
  'GET_default': 500,
  'POST_default': 1000,
  'PUT_default': 800,
  'DELETE_default': 300
};

/**
 * Get performance budget for a route
 */
export function getPerformanceBudget(route: string, method: string = 'GET'): number {
  // Exact match first
  if (PERFORMANCE_BUDGETS[route]) {
    return PERFORMANCE_BUDGETS[route];
  }
  
  // Pattern matching for parameterized routes
  const patterns = [
    { pattern: /^\/api\/v2\/cards\/[\w-]+$/, budget: 100 },
    { pattern: /^\/api\/sessions\/[\w-]+$/, budget: 300 },
    { pattern: /^\/api\/users\/[\w-]+$/, budget: 200 },
    { pattern: /^\/docs\/.*$/, budget: 150 }
  ];
  
  for (const { pattern, budget } of patterns) {
    if (pattern.test(route)) {
      return budget;
    }
  }
  
  // Method-based defaults
  return PERFORMANCE_BUDGETS[`${method}_default`] || 1000;
}

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (
  req: Request,
  res: Response, 
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Monitor response completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = getRoutePattern(req);
    const budget = getPerformanceBudget(route, req.method);
    
    // Performance metrics
    const perfData = {
      type: 'request_complete',
      duration,
      budget,
      budgetExceeded: duration > budget,
      statusCode: res.statusCode,
      route,
      method: req.method,
      responseSize: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0
    };
    
    // Log based on performance
    if (duration > budget) {
      req.logger.warn(perfData, 
        `⚠️ Performance budget exceeded: ${duration}ms > ${budget}ms (${route})`
      );
    } else if (duration > budget * 0.8) {
      req.logger.info(perfData,
        `⏱️ Near budget limit: ${duration}ms / ${budget}ms (${route})`
      );
    } else {
      req.logger.debug(perfData,
        `✅ ${req.method} ${route} ${res.statusCode} ${duration}ms`
      );
    }
    
    // Update Prometheus metrics
    updatePerformanceMetrics(req.method, route, res.statusCode, duration, budget);
  });
  
  next();
};

/**
 * Extract route pattern for consistent metrics
 */
function getRoutePattern(req: Request): string {
  // Use Express route if available
  if (req.route?.path && req.baseUrl) {
    return req.baseUrl + req.route.path;
  }
  
  if (req.route?.path) {
    return req.route.path;
  }
  
  // Manual pattern matching for non-Express routes
  const url = req.originalUrl.split('?')[0];
  
  const patterns = [
    { regex: /^\/api\/v2\/cards\/[^\/]+$/, replacement: '/api/v2/cards/:id' },
    { regex: /^\/api\/v2\/cards$/, replacement: '/api/v2/cards' },
    { regex: /^\/api\/sessions\/[^\/]+$/, replacement: '/api/sessions/:id' },
    { regex: /^\/api\/sessions$/, replacement: '/api/sessions' },
    { regex: /^\/api\/feedback$/, replacement: '/api/feedback' },
    { regex: /^\/api\/users\/[^\/]+$/, replacement: '/api/users/:id' },
    { regex: /^\/docs\/.*$/, replacement: '/docs/*' },
    { regex: /^\/health$/, replacement: '/health' },
    { regex: /^\/metrics$/, replacement: '/metrics' }
  ];
  
  for (const { regex, replacement } of patterns) {
    if (regex.test(url)) {
      return replacement;
    }
  }
  
  return url;
}

/**
 * Update performance metrics in Prometheus
 */
function updatePerformanceMetrics(
  method: string,
  route: string, 
  statusCode: number,
  duration: number,
  budget: number
): void {
  try {
    // This would integrate with our existing Prometheus metrics
    const { recordHttpRequest } = require('../observability/metrics');
    recordHttpRequest(method, route, statusCode, duration / 1000); // Convert to seconds
    
    // Performance budget metrics
    const { performanceBudgetExceeded } = require('../observability/metrics');
    if (duration > budget) {
      performanceBudgetExceeded?.inc({ method, route });
    }
  } catch (error) {
    logger.warn({ error: (error as Error).message }, 'Failed to update performance metrics');
  }
}

/**
 * Request completion logging middleware
 */
export const requestCompleteMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const route = getRoutePattern(req);
    
    // Comprehensive request completion log
    req.logger.info({
      type: 'request_complete',
      statusCode: res.statusCode,
      duration,
      route,
      responseSize: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0,
      success: res.statusCode < 400
    }, `← ${req.method} ${route} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLoggingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const duration = Date.now() - req.startTime;
  
  // Log error with full context
  req.logger.error({
    type: 'request_error',
    err,
    duration,
    route: getRoutePattern(req),
    statusCode: res.statusCode || 500,
    stack: err.stack
  }, `💥 ${err.message}`);
  
  next(err);
};

/**
 * Health check with enhanced logging
 */
export const healthLogger = {
  success: (component: string, duration: number, details?: any) => {
    logger.info({
      type: 'health_check',
      component,
      duration,
      status: 'healthy',
      details
    }, `✅ Health check passed: ${component} (${duration}ms)`);
  },
  
  failure: (component: string, duration: number, error: Error, details?: any) => {
    logger.error({
      type: 'health_check',
      component,
      duration,
      status: 'unhealthy',
      err: error,
      details
    }, `❌ Health check failed: ${component} (${duration}ms)`);
  }
};

export default logger;