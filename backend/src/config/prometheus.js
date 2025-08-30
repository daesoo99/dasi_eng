/**
 * Prometheus Metrics Configuration
 * 모니터링 메트릭스 설정 분리
 */

const client = require('prom-client');

// Prometheus metrics setup
const Registry = client.Registry;
const register = new Registry();
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpReqDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 400, 800, 1600, 3200]
});
register.registerMetric(httpReqDuration);

// Cache hit rate gauge
const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate_total',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type']
});
register.registerMetric(cacheHitRate);

// Queue processing metrics
const queueProcessingTime = new client.Histogram({
  name: 'queue_processing_time_ms',
  help: 'Queue task processing time in milliseconds',
  labelNames: ['queue_type', 'task_type'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000]
});
register.registerMetric(queueProcessingTime);

// API endpoint counter
const apiRequestsTotal = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'endpoint', 'status_code']
});
register.registerMetric(apiRequestsTotal);

// Memory usage gauge
const memoryUsage = new client.Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type']
});
register.registerMetric(memoryUsage);

module.exports = {
  register,
  httpReqDuration,
  cacheHitRate,
  queueProcessingTime,
  apiRequestsTotal,
  memoryUsage
};