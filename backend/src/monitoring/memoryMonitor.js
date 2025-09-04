const client = require('prom-client');
const EventEmitter = require('events');

// Memory leak monitoring - use shared registry to avoid conflicts
const { memoryUsage } = require('../config/prometheus');

const eventListenerCounter = new client.Gauge({
  name: 'nodejs_event_listeners_total',
  help: 'Total number of event listeners',
  labelNames: ['event_name']
});

class MemoryMonitor {
  constructor() {
    this.initialRSS = process.memoryUsage().rss;
    this.maxRSSThreshold = this.initialRSS * 2; // Alert if RSS doubles
    this.monitoringInterval = null;
    this.listenerBaselineCounts = new Map();
  }

  start(intervalMs = 30000) {
    console.log('📊 Memory monitoring started');
    
    // Establish baseline for event listeners
    this.establishListenerBaseline();
    
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryMetrics();
      this.checkForLeaks();
    }, intervalMs);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('📊 Memory monitoring stopped');
    }
  }

  collectMemoryMetrics() {
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

  establishListenerBaseline() {
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

  checkForLeaks() {
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
    if (process.listenerCount() > maxListeners * 2) {
      console.warn(`⚠️ Process has ${process.listenerCount()} listeners (threshold: ${maxListeners * 2})`);
      hasLeaks = true;
    }

    return hasLeaks;
  }

  generateHeapSnapshot() {
    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');
      
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

  forceGC() {
    if (global.gc) {
      global.gc();
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
module.exports = {
  memoryMonitor,
  metrics: {
    eventListenerCounter
  }
};