/**
 * Enhanced Observability Middleware - Request Tracking & Metrics
 * @description HTTP 요청 추적, 메트릭 수집, 성능 모니터링, 분산 트레이싱
 */

import express from 'express';
import onFinished from 'on-finished';
import { 
  recordHttpRequest, 
  recordPerformanceBudget,
  recordRequestStart,
  recordRequestEnd,
  recordRequestIdGenerated,
  getMetrics 
} from '../shared/observability/metrics';
import { 
  logger,
  requestIdMiddleware as enhancedRequestIdMiddleware,
  performanceMiddleware,
  requestCompleteMiddleware,
  errorLoggingMiddleware,
  getPerformanceBudget,
  healthLogger
} from '../shared/logging/logger';
import { CategorizedError, categorizeError } from '../shared/errors/CategorizedError';

/**
 * Enhanced Request ID middleware - delegate to enhanced logging system
 */
export const requestIdMiddleware = enhancedRequestIdMiddleware;

/**
 * Enhanced metrics middleware with performance budget monitoring
 */
export function metricsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const startTime = Date.now();
  const route = getRoutePattern(req);
  const userType = getUserType(req);
  
  // Track request start
  recordRequestStart(req.method, route);
  
  // 요청 크기 계산
  let requestSize = 0;
  if (req.get('Content-Length')) {
    requestSize = parseInt(req.get('Content-Length')!, 10);
  }
  
  // 응답 완료 시 메트릭 기록
  onFinished(res, () => {
    const duration = Date.now() - startTime; // milliseconds
    const durationSeconds = duration / 1000; // seconds for Prometheus
    
    // Track request end
    recordRequestEnd(req.method, route);
    
    // 응답 크기 계산
    const responseSize = res.get('Content-Length') ? 
      parseInt(res.get('Content-Length')!, 10) : 0;
    
    // Record HTTP request metrics
    recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      durationSeconds,
      requestSize,
      responseSize,
      userType
    );
    
    // Record performance budget metrics
    const budget = getPerformanceBudget(route, req.method);
    recordPerformanceBudget(req.method, route, duration, budget);
    
    // Enhanced logging is handled by performanceMiddleware and requestCompleteMiddleware
  });
  
  next();
}

/**
 * 라우트 패턴 추출 (메트릭 카디널리티 제어)
 */
function getRoutePattern(req: express.Request): string {
  // Express route가 있는 경우
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  
  // 수동으로 패턴 매칭 (주요 API 패턴)
  const url = req.originalUrl.split('?')[0]; // 쿼리 파라미터 제거
  
  // API 패턴 정규화
  const patterns = [
    { pattern: /^\/api\/v\d+\/cards\/[^\/]+$/, replacement: '/api/v*/cards/:id' },
    { pattern: /^\/api\/v\d+\/cards$/, replacement: '/api/v*/cards' },
    { pattern: /^\/api\/sessions\/[^\/]+$/, replacement: '/api/sessions/:id' },
    { pattern: /^\/api\/sessions$/, replacement: '/api/sessions' },
    { pattern: /^\/api\/feedback$/, replacement: '/api/feedback' },
    { pattern: /^\/api\/users\/[^\/]+$/, replacement: '/api/users/:id' },
    { pattern: /^\/docs\/.*$/, replacement: '/docs/*' },
    { pattern: /^\/health$/, replacement: '/health' },
    { pattern: /^\/metrics$/, replacement: '/metrics' }
  ];
  
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(url)) {
      return replacement;
    }
  }
  
  // 기본값: 경로 세그먼트 수 제한
  const segments = url.split('/').slice(1, 4); // 최대 3개 세그먼트
  return '/' + segments.join('/');
}

/**
 * 사용자 타입 결정
 */
function getUserType(req: express.Request): string {
  const user = (req as any).user;
  
  if (!user) return 'anonymous';
  if (user.subscription === 'premium') return 'premium';
  if (user.subscription === 'free') return 'free';
  
  return 'unknown';
}

/**
 * Enhanced error tracking middleware with categorization
 */
export function errorTrackingMiddleware(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  // Categorize error
  const categorizedError = err instanceof CategorizedError ? 
    err : 
    categorizeError(err, {
      requestId: req.requestId,
      route: getRoutePattern(req),
      method: req.method,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  
  // Set appropriate HTTP status
  if (!res.headersSent) {
    res.status(categorizedError.getHttpStatus());
  }
  
  // Log error using request logger (includes requestId automatically)
  req.logger.error({
    type: 'categorized_error',
    category: categorizedError.category,
    severity: categorizedError.severity,
    errorCode: categorizedError.code,
    err: categorizedError,
    alertRequired: categorizedError.shouldAlert(),
    isOperational: categorizedError.isOperational
  }, `💥 ${categorizedError.category}Error: ${categorizedError.message}`);
  
  // Trigger alerts for high-severity errors
  if (categorizedError.shouldAlert()) {
    triggerAlert(categorizedError, req);
  }
  
  next(err);
}

/**
 * Trigger alert for critical errors (placeholder for actual alert system)
 */
function triggerAlert(error: CategorizedError, req: express.Request): void {
  // TODO: Integrate with actual alerting system (Slack, PagerDuty, etc.)
  logger.error({
    type: 'alert_triggered',
    error: error.toResponse(),
    requestId: req.requestId,
    route: getRoutePattern(req)
  }, `🚨 ALERT: ${error.severity} ${error.category} error requires attention`);
}

/**
 * 컴포넌트 이름 추출
 */
function getComponentFromRoute(req: express.Request): string {
  const url = req.originalUrl;
  
  if (url.includes('/api/cards')) return 'cards';
  if (url.includes('/api/sessions')) return 'sessions';  
  if (url.includes('/api/feedback')) return 'feedback';
  if (url.includes('/api/users')) return 'users';
  if (url.includes('/docs')) return 'docs';
  
  return 'unknown';
}

/**
 * Prometheus 메트릭 엔드포인트
 */
export async function metricsEndpoint(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const metrics = await getMetrics();
    
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metrics);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to generate metrics');
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics',
      code: 'METRICS_ERROR'
    });
  }
}

/**
 * Enhanced health check endpoint with categorized error handling
 */
export async function healthCheckEndpoint(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // 기본 헬스 체크
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      requestId: req.requestId
    };
    
    // 외부 서비스 상태 체크 (옵션)
    if (req.query.detailed === 'true') {
      try {
        const { checkFirebaseHealth } = require('../config/firebase');
        const firebaseHealth = await checkFirebaseHealth();
        
        Object.assign(health, {
          services: {
            firebase: firebaseHealth.connected,
            // Redis, external APIs 등 추가 가능
          }
        });
      } catch (serviceError) {
        // Service health check failures are non-critical
        req.logger.warn({ err: serviceError }, 'Service health check failed');
        Object.assign(health, {
          services: {
            firebase: false,
            warning: 'Some service checks failed'
          }
        });
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // 헬스 체크 성공 로그
    healthLogger.success('api', Math.round(duration * 1000), health);
    
    // 헬스 체크 메트릭 기록
    const { updateHealthStatus } = require('../shared/observability/metrics');
    updateHealthStatus('api', true, duration);
    
    res.status(200).json({
      success: true,
      data: health,
      meta: {
        timestamp: Date.now(),
        responseTime: Math.round(duration * 1000),
        requestId: req.requestId
      }
    });
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    const durationMs = Math.round(duration * 1000);
    
    // Create categorized error
    const categorizedError = new CategorizedError(
      'Health check failed',
      'HEALTH_CHECK_ERROR',
      'infrastructure',
      'high',
      {
        requestId: req.requestId,
        route: '/health',
        method: 'GET'
      },
      error instanceof Error ? error.message : String(error)
    );
    
    // 헬스 체크 실패 로그
    healthLogger.failure('api', durationMs, categorizedError);
    
    // 헬스 체크 실패 메트릭 기록
    const { updateHealthStatus } = require('../shared/observability/metrics');
    updateHealthStatus('api', false, duration);
    
    // Return categorized error response
    res.status(categorizedError.getHttpStatus()).json(categorizedError.toResponse());
  }
}

/**
 * 성능 분석 미들웨어 (디버깅용)
 */
export function performanceAnalysisMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }
  
  const startTime = process.hrtime.bigint();
  
  onFinished(res, () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1000000;
    
    // 느린 요청 감지 (>1초)
    if (durationMs > 1000) {
      logger.warn({
        type: 'slow_request',
        method: req.method,
        url: req.originalUrl,
        duration_ms: Math.round(durationMs),
        request_id: (req as any).requestId
      }, `Slow request detected: ${durationMs.toFixed(2)}ms`);
    }
  });
  
  next();
}

// Export enhanced middleware functions for additional use
export { 
  performanceMiddleware,
  requestCompleteMiddleware,
  errorLoggingMiddleware
};