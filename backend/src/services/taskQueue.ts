/**
 * TaskQueue - 모니터링 기능이 포함된 작업 큐 관리
 * TypeScript 변환: PQueue + Prometheus 메트릭
 */

import PQueue from 'p-queue';
import * as client from 'prom-client';
import logger from '../monitoring/logger';

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

// Types
interface QueueOptions {
  concurrency?: number;
  intervalCap?: number;
  interval?: number;
}

interface TaskOptions {
  taskType?: string;
  priority?: number;
  delay?: number;
}

interface MonitoredQueue extends PQueue {
  add<T = any>(task: () => Promise<T>, options?: TaskOptions): Promise<T>;
}

/**
 * 모니터링 기능이 포함된 큐 생성
 */
function createMonitoredQueue(
  queueType: string, 
  options: QueueOptions = {}
): MonitoredQueue {
  const queue = new PQueue({
    concurrency: 2,
    intervalCap: 5,
    interval: 1000,
    ...options
  }) as MonitoredQueue;

  // 5초마다 메트릭 업데이트
  const metricsInterval = setInterval(() => {
    queueSize.labels(queueType).set(queue.size);
    queuePending.labels(queueType).set(queue.pending);
  }, 5000);

  // 큐가 종료될 때 인터벌 정리
  const originalOnIdle = queue.onIdle.bind(queue);
  queue.onEmpty().then(() => {
    // 큐가 완전히 비워지면 메트릭 업데이트 중단
    // 실제 운영에서는 필요에 따라 조정
  });

  // add 메서드를 래핑하여 처리 시간 추적
  const originalAdd = queue.add.bind(queue);
  
  queue.add = function<T = any>(
    task: () => Promise<T>, 
    options: TaskOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const taskType = options.taskType || 'unknown';
    
    return originalAdd(async () => {
      try {
        logger.queue(`Starting ${queueType} task`, { 
          taskType, 
          queueSize: queue.size,
          pending: queue.pending
        });
        
        const result = await task();
        const duration = Date.now() - startTime;
        
        taskProcessingTime
          .labels(queueType, taskType, 'success')
          .observe(duration);
          
        logger.queue(`Completed ${queueType} task`, {
          taskType,
          duration,
          status: 'success'
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        taskProcessingTime
          .labels(queueType, taskType, 'error')
          .observe(duration);
          
        logger.queue(`Failed ${queueType} task`, {
          taskType,
          duration,
          status: 'error',
          error: errorMessage
        });
        
        throw error;
      }
    }, {
      priority: options.priority,
      delay: options.delay
    });
  };

  return queue;
}

// Queue instances
export const sttQueue = createMonitoredQueue('stt', {
  concurrency: 1,  // STT는 리소스 집약적이므로 1로 제한
  intervalCap: 3,
  interval: 1000
});

export const llmQueue = createMonitoredQueue('llm', {
  concurrency: 2,  // LLM은 동시 처리 가능
  intervalCap: 5,
  interval: 1000
});

export const ttsQueue = createMonitoredQueue('tts', {
  concurrency: 3,  // TTS는 상대적으로 빠르므로 더 많은 동시 처리
  intervalCap: 10,
  interval: 1000
});

// Queue status information
export const getQueueStatus = () => {
  return {
    stt: {
      size: sttQueue.size,
      pending: sttQueue.pending,
      isPaused: sttQueue.isPaused
    },
    llm: {
      size: llmQueue.size,
      pending: llmQueue.pending,
      isPaused: llmQueue.isPaused
    },
    tts: {
      size: ttsQueue.size,
      pending: ttsQueue.pending,
      isPaused: ttsQueue.isPaused
    }
  };
};

// Graceful shutdown
export const shutdownQueues = async (): Promise<void> => {
  console.log('🛑 Shutting down task queues...');
  
  try {
    // 새로운 작업 추가 중단
    sttQueue.pause();
    llmQueue.pause();
    ttsQueue.pause();
    
    // 진행 중인 작업이 완료될 때까지 대기 (최대 30초)
    const timeout = 30000;
    await Promise.race([
      Promise.all([
        sttQueue.onIdle(),
        llmQueue.onIdle(),
        ttsQueue.onIdle()
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue shutdown timeout')), timeout)
      )
    ]);
    
    console.log('✅ Task queues shut down gracefully');
  } catch (error) {
    console.error('⚠️ Queue shutdown error:', error);
    // Force clear queues
    sttQueue.clear();
    llmQueue.clear();
    ttsQueue.clear();
  }
};

// Export metrics for Prometheus
export const metrics = {
  queueSize,
  queuePending,
  taskProcessingTime
};

// Register custom collectors
client.register.registerMetric(queueSize);
client.register.registerMetric(queuePending);
client.register.registerMetric(taskProcessingTime);