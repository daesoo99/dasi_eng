import * as client from 'prom-client';
import { EventEmitter } from 'events';
import * as v8 from 'v8';
import * as fs from 'fs';
import * as path from 'path';

// Type declarations for global object access
declare global {
  var io: any;
}

// Memory leak monitoring - use shared registry to avoid conflicts
const { memoryUsage } = require('../config/prometheus');

const eventListenerCounter = new client.Gauge({
  name: 'nodejs_event_listeners_total',
  help: 'Total number of event listeners',
  labelNames: ['event_name']
});

class MemoryMonitor {
  private initialRSS: number;
  private maxRSSThreshold: number;
  private monitoringInterval: NodeJS.Timeout | null;
  private listenerBaselineCounts: Map<string, number>;

  constructor() {
    this.initialRSS = process.memoryUsage().rss;
    this.maxRSSThreshold = this.initialRSS * 2; // Alert if RSS doubles
    this.monitoringInterval = null;
    this.listenerBaselineCounts = new Map();
  }

  start(intervalMs: number = 30000): void {
    console.log('📊 Memory monitoring started');
    
    // Establish baseline for event listeners
    this.establishListenerBaseline();
    
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryMetrics();
      this.checkForLeaks();
    }, intervalMs);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('📊 Memory monitoring stopped');
    }
  }

  collectMemoryMetrics(): NodeJS.MemoryUsage {
    const memory = process.memoryUsage();
    
    // Update Prometheus metrics using shared memoryUsage gauge
    memoryUsage.labels('rss').set(memory.rss);
    memoryUsage.labels('heap_used').set(memory.heapUsed);
    memoryUsage.labels('heap_total').set(memory.heapTotal);
    memoryUsage.labels('external').set(memory.external);

    // Check for memory leaks
    if (memory.rss > this.maxRSSThreshold) {
      console.warn(`⚠️ Memory leak warning: RSS ${Math.round(memory.rss / 1024 / 1024)}MB exceeds threshold ${Math.round(this.maxRSSThreshold / 1024 / 1024)}MB`);
      this.generateHeapSnapshot();
    }

    return memory;
  }

  establishListenerBaseline(): void {
    const eventNames = ['connection', 'error', 'close', 'data', 'end', 'message'];
    
    // Check Socket.IO event listeners
    if (global.io && global.io.engine) {
      eventNames.forEach(eventName => {
        const count = global.io.engine.listenerCount(eventName);
        this.listenerBaselineCounts.set(`io_${eventName}`, count);
      });
    }

    // Check process event listeners  
    eventNames.forEach(eventName => {
      const count = process.listenerCount(eventName);
      this.listenerBaselineCounts.set(`process_${eventName}`, count);
    });

    console.log('📊 Event listener baseline established:', Object.fromEntries(this.listenerBaselineCounts));
  }

  checkForLeaks(): boolean {
    let hasLeaks = false;

    // Check event listener growth
    this.listenerBaselineCounts.forEach((baseline, key) => {
      const [source, eventName] = key.split('_');
      let currentCount = 0;

      if (source === 'io' && global.io && global.io.engine) {
        currentCount = global.io.engine.listenerCount(eventName);
      } else if (source === 'process') {
        currentCount = process.listenerCount(eventName);
      }

      eventListenerCounter.labels(key).set(currentCount);

      // Alert if listeners have grown significantly
      if (currentCount > baseline * 2) {
        console.warn(`⚠️ Event listener leak detected: ${key} grew from ${baseline} to ${currentCount}`);
        hasLeaks = true;
      }
    });

    // Check for excessive listeners on any emitter
    const maxListeners = EventEmitter.defaultMaxListeners || 10;
    const totalListeners = process.listenerCount('error') + process.listenerCount('uncaughtException') + process.listenerCount('unhandledRejection');
    if (totalListeners > maxListeners * 2) {
      console.warn(`⚠️ Process has ${totalListeners} listeners (threshold: ${maxListeners * 2})`);
      hasLeaks = true;
    }

    return hasLeaks;
  }

  generateHeapSnapshot(): void {
    try {
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `heap-snapshot-${timestamp}.heapsnapshot`;
      const filepath = path.join(process.cwd(), 'logs', filename);
      
      // Ensure logs directory exists
      const logsDir = path.dirname(filepath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const heapSnapshot = v8.getHeapSnapshot();
      const writeStream = fs.createWriteStream(filepath);
      
      heapSnapshot.pipe(writeStream);
      
      writeStream.on('finish', () => {
        console.log(`💾 Heap snapshot saved: ${filepath}`);
      });
      
      writeStream.on('error', (error) => {
        console.error('❌ Failed to save heap snapshot:', error);
      });
      
    } catch (error) {
      console.error('❌ Failed to generate heap snapshot:', error);
    }
  }

  forceGC(): any {
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
      console.log('🗑️ Forced garbage collection');
      return this.collectMemoryMetrics();
    } else {
      console.warn('⚠️ Garbage collection not exposed. Run with --expose-gc flag');
      return null;
    }
  }
}

// Singleton instance
const memoryMonitor = new MemoryMonitor();

// Export metrics for registration
export { memoryMonitor };
export const metrics = {
  eventListenerCounter
};