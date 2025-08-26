const PQueue = require('p-queue').default;
const client = require('prom-client');
const logger = require('../monitoring/logger');

// Queue metrics
const queueSize = new client.Gauge({
  name: 'queue_size_total',
  help: 'Number of tasks in queue',
  labelNames: ['queue_type']
});

const queuePending = new client.Gauge({
  name: 'queue_pending_total',
  help: 'Number of pending tasks in queue',
  labelNames: ['queue_type']
});

const taskProcessingTime = new client.Histogram({
  name: 'task_processing_time_ms',
  help: 'Task processing time in milliseconds',
  labelNames: ['queue_type', 'task_type', 'status'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000]
});

// Enhanced queue wrapper with metrics
function createMonitoredQueue(queueType, options = {}) {
  const queue = new PQueue({ 
    concurrency: 2, 
    intervalCap: 5, 
    interval: 1000,
    ...options
  });

  // Update metrics every 5 seconds
  setInterval(() => {
    queueSize.labels(queueType).set(queue.size);
    queuePending.labels(queueType).set(queue.pending);
  }, 5000);

  // Wrap the add method to track processing time
  const originalAdd = queue.add.bind(queue);
  queue.add = function(task, options = {}) {
    const startTime = Date.now();
    const taskType = options.taskType || 'unknown';
    
    return originalAdd(async () => {
      try {
        logger.queue(`Starting ${queueType} task`, { taskType, queueSize: queue.size });
        
        const result = await task();
        const duration = Date.now() - startTime;
        
        taskProcessingTime.labels(queueType, taskType, 'success').observe(duration);
        logger.queue(`Completed ${queueType} task`, { 
          taskType, 
          duration, 
          status: 'success'
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        taskProcessingTime.labels(queueType, taskType, 'error').observe(duration);
        logger.queue(`Failed ${queueType} task`, { 
          taskType, 
          duration, 
          status: 'error',
          error: error.message
        });
        
        throw error;
      }
    }, options);
  };

  return queue;
}

// 동시 2, 초당 5건 속도 제한(예시). 필요시 조정.
const sttQueue = createMonitoredQueue('stt');
const llmQueue = createMonitoredQueue('llm');
const ttsQueue = createMonitoredQueue('tts');

// Export metrics for registration in server.js
module.exports = { 
  sttQueue, 
  llmQueue, 
  ttsQueue,
  metrics: {
    queueSize,
    queuePending,
    taskProcessingTime
  }
};