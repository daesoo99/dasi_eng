/**
 * Application Metrics - Prometheus Integration
 * @description 애플리케이션 성능 및 비즈니스 메트릭 수집
 */

import * as client from 'prom-client';

// Default metrics 등록
client.register.setDefaultLabels({
  app: 'dasi-backend',
  version: process.env.npm_package_version || '1.0.0'
});

// Collect default Node.js metrics
client.collectDefaultMetrics({
  prefix: 'dasi_nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ===== HTTP Request Metrics =====
export const httpRequestTotal = new client.Counter({
  name: 'dasi_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_type']
});

export const httpRequestDuration = new client.Histogram({
  name: 'dasi_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

export const httpRequestSize = new client.Histogram({
  name: 'dasi_http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

export const httpResponseSize = new client.Histogram({
  name: 'dasi_http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

// ===== Business Logic Metrics =====
export const cardsServed = new client.Counter({
  name: 'dasi_cards_served_total',
  help: 'Total number of cards served to users',
  labelNames: ['level', 'stage', 'source'] // source: cache/db
});

export const studySessionsStarted = new client.Counter({
  name: 'dasi_study_sessions_started_total',
  help: 'Total number of study sessions started',
  labelNames: ['level', 'user_type']
});

export const studySessionDuration = new client.Histogram({
  name: 'dasi_study_session_duration_seconds',
  help: 'Study session duration in seconds',
  labelNames: ['level', 'completed'],
  buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600] // 30s to 1h
});

export const feedbackGenerated = new client.Counter({
  name: 'dasi_feedback_generated_total',
  help: 'Total number of feedback responses generated',
  labelNames: ['accuracy_range', 'cached'] // accuracy_range: low/medium/high
});

export const feedbackProcessingTime = new client.Histogram({
  name: 'dasi_feedback_processing_seconds',
  help: 'Time taken to generate feedback',
  labelNames: ['type'], // type: basic/custom
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

export const speechAccuracyScore = new client.Histogram({
  name: 'dasi_speech_accuracy_score',
  help: 'Distribution of speech accuracy scores (0-100)',
  labelNames: ['level', 'stage'],
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
});

// ===== Cache Metrics =====
export const cacheOperations = new client.Counter({
  name: 'dasi_cache_operations_total',
  help: 'Total cache operations',
  labelNames: ['operation', 'cache_type', 'result'] // operation: get/set, result: hit/miss/error
});

export const cacheSize = new client.Gauge({
  name: 'dasi_cache_size_items',
  help: 'Current number of items in cache',
  labelNames: ['cache_type']
});

export const cacheTTLRemaining = new client.Histogram({
  name: 'dasi_cache_ttl_remaining_seconds',
  help: 'Remaining TTL for cache items when accessed',
  labelNames: ['cache_type'],
  buckets: [1, 60, 300, 1800, 3600, 14400, 86400] // 1s to 1day
});

// ===== AI/External Service Metrics =====
export const aiServiceCalls = new client.Counter({
  name: 'dasi_ai_service_calls_total',
  help: 'Total calls to AI services',
  labelNames: ['service', 'status'] // service: gemini/whisper/tts, status: success/error
});

export const aiServiceDuration = new client.Histogram({
  name: 'dasi_ai_service_duration_seconds',
  help: 'AI service response time',
  labelNames: ['service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

export const queueSize = new client.Gauge({
  name: 'dasi_queue_size_total',
  help: 'Current queue size',
  labelNames: ['queue_type'] // stt/llm/tts
});

export const queueProcessingTime = new client.Histogram({
  name: 'dasi_queue_processing_seconds',
  help: 'Time spent processing queue items',
  labelNames: ['queue_type', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
});

// ===== Database Metrics =====
export const dbOperations = new client.Counter({
  name: 'dasi_db_operations_total',
  help: 'Total database operations',
  labelNames: ['operation', 'collection', 'status'] // operation: read/write/delete
});

export const dbOperationDuration = new client.Histogram({
  name: 'dasi_db_operation_duration_seconds',
  help: 'Database operation duration',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

// ===== User Behavior Metrics =====
export const userActions = new client.Counter({
  name: 'dasi_user_actions_total',
  help: 'Total user actions',
  labelNames: ['action', 'user_level', 'success'] // action: login/study/review/etc
});

export const userRetention = new client.Histogram({
  name: 'dasi_user_retention_days',
  help: 'User retention in days since last login',
  labelNames: ['user_type'],
  buckets: [1, 3, 7, 14, 30, 60, 90, 180, 365]
});

export const learningProgress = new client.Gauge({
  name: 'dasi_learning_progress_cards',
  help: 'Current learning progress (cards mastered)',
  labelNames: ['user_id', 'level']
});

// ===== Error Tracking =====
export const errorCount = new client.Counter({
  name: 'dasi_errors_total',
  help: 'Total application errors',
  labelNames: ['error_type', 'severity', 'component']
});

export const errorRate = new client.Gauge({
  name: 'dasi_error_rate_percent',
  help: 'Current error rate percentage',
  labelNames: ['component', 'time_window'] // time_window: 1m/5m/15m
});

// ===== Health Check Metrics =====
export const healthCheckStatus = new client.Gauge({
  name: 'dasi_health_check_status',
  help: 'Health check status (1=healthy, 0=unhealthy)',
  labelNames: ['service'] // firebase/redis/external_api
});

export const healthCheckDuration = new client.Histogram({
  name: 'dasi_health_check_duration_seconds',
  help: 'Health check duration',
  labelNames: ['service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// ===== Performance Budget Metrics =====
export const performanceBudgetExceeded = new client.Counter({
  name: 'dasi_performance_budget_exceeded_total',
  help: 'Total number of requests exceeding performance budget',
  labelNames: ['method', 'route']
});

export const performanceBudgetRatio = new client.Histogram({
  name: 'dasi_performance_budget_ratio',
  help: 'Ratio of actual duration to performance budget (1.0 = exactly at budget)',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0]
});

export const slowRequestsTotal = new client.Counter({
  name: 'dasi_slow_requests_total', 
  help: 'Total number of slow requests by severity',
  labelNames: ['method', 'route', 'severity'] // warning/critical
});

// ===== Request Tracking Metrics =====
export const requestsInFlight = new client.Gauge({
  name: 'dasi_requests_in_flight',
  help: 'Current number of requests being processed',
  labelNames: ['method', 'route']
});

export const requestIdGenerated = new client.Counter({
  name: 'dasi_request_ids_generated_total',
  help: 'Total number of request IDs generated',
  labelNames: ['source'] // header/generated
});

// ===== Utility Functions =====

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  requestSize?: number,
  responseSize?: number,
  userType: string = 'anonymous'
) {
  httpRequestTotal.inc({ method, route, status_code: statusCode.toString(), user_type: userType });
  httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
  
  if (requestSize) {
    httpRequestSize.observe({ method, route }, requestSize);
  }
  
  if (responseSize) {
    httpResponseSize.observe({ method, route }, responseSize);
  }
}

/**
 * Record business metrics
 */
export function recordCardServed(level: number, stage: number, source: 'cache' | 'db' = 'db') {
  cardsServed.inc({ level: level.toString(), stage: stage.toString(), source });
}

export function recordStudySession(level: number, userType: string, duration?: number, completed: boolean = false) {
  studySessionsStarted.inc({ level: level.toString(), user_type: userType });
  
  if (duration) {
    studySessionDuration.observe({ level: level.toString(), completed: completed.toString() }, duration);
  }
}

export function recordFeedback(accuracyScore: number, processingTime: number, cached: boolean = false, type: 'basic' | 'custom' = 'basic') {
  const accuracyRange = accuracyScore >= 80 ? 'high' : accuracyScore >= 60 ? 'medium' : 'low';
  feedbackGenerated.inc({ accuracy_range: accuracyRange, cached: cached.toString() });
  feedbackProcessingTime.observe({ type }, processingTime);
  
  // Assume we know level/stage from context
  speechAccuracyScore.observe({}, accuracyScore);
}

/**
 * Record AI service call
 */
export function recordAIServiceCall(service: 'gemini' | 'whisper' | 'tts', duration: number, success: boolean = true) {
  aiServiceCalls.inc({ service, status: success ? 'success' : 'error' });
  aiServiceDuration.observe({ service }, duration);
}

/**
 * Record cache operation
 */
export function recordCacheOperation(
  operation: 'get' | 'set', 
  cacheType: string, 
  result: 'hit' | 'miss' | 'error'
) {
  cacheOperations.inc({ operation, cache_type: cacheType, result });
}

/**
 * Record performance budget metrics
 */
export function recordPerformanceBudget(
  method: string,
  route: string,
  actualDuration: number,
  budget: number
): void {
  const ratio = actualDuration / budget;
  
  // Record budget ratio
  performanceBudgetRatio.observe({ method, route }, ratio);
  
  // Count budget exceedances
  if (actualDuration > budget) {
    performanceBudgetExceeded.inc({ method, route });
    
    // Categorize slow requests
    const severity = actualDuration > budget * 2 ? 'critical' : 'warning';
    slowRequestsTotal.inc({ method, route, severity });
  }
}

/**
 * Track requests in flight
 */
export function recordRequestStart(method: string, route: string): void {
  requestsInFlight.inc({ method, route });
}

export function recordRequestEnd(method: string, route: string): void {
  requestsInFlight.dec({ method, route });
}

/**
 * Track request ID generation
 */
export function recordRequestIdGenerated(source: 'header' | 'generated'): void {
  requestIdGenerated.inc({ source });
}

/**
 * Update health check status
 */
export function updateHealthStatus(service: string, healthy: boolean, duration?: number) {
  healthCheckStatus.set({ service }, healthy ? 1 : 0);
  
  if (duration) {
    healthCheckDuration.observe({ service }, duration);
  }
}

/**
 * Get metrics for Prometheus scraping
 */
export function getMetrics(): Promise<string> {
  return client.register.metrics();
}

/**
 * Get metrics as JSON (for debugging)
 */
export async function getMetricsJSON() {
  const metrics = await client.register.getMetricsAsJSON();
  return {
    timestamp: Date.now(),
    metrics: metrics.map(metric => ({
      name: metric.name,
      help: metric.help,
      type: metric.type,
      values: metric.values
    }))
  };
}