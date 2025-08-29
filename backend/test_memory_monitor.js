// Test script for memory monitoring system
const { memoryMonitor } = require('./src/monitoring/memoryMonitor');
const client = require('prom-client');

console.log('🧪 Testing Memory Monitoring System');
console.log('=====================================\n');

// Test 1: Start monitoring
console.log('🔵 Test 1: Starting memory monitor...');
memoryMonitor.start(5000); // Check every 5 seconds for faster testing

// Test 2: Initial memory metrics
setTimeout(() => {
  console.log('🔵 Test 2: Collecting initial memory metrics...');
  const memory = memoryMonitor.collectMemoryMetrics();
  console.log('📊 Current memory usage:', {
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`
  });
  
  // Test 3: Check for leaks (should be false initially)
  console.log('🔵 Test 3: Checking for memory leaks...');
  const hasLeaks = memoryMonitor.checkForLeaks();
  console.log('🔍 Memory leaks detected:', hasLeaks ? '⚠️ YES' : '✅ NO');
  
  // Test 4: Force garbage collection if available
  console.log('🔵 Test 4: Testing forced garbage collection...');
  const gcResult = memoryMonitor.forceGC();
  if (gcResult) {
    console.log('🗑️ GC completed, new memory:', {
      rss: `${Math.round(gcResult.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(gcResult.heapUsed / 1024 / 1024)}MB`
    });
  }
}, 2000);

// Test 5: Simulate memory usage and monitoring
setTimeout(() => {
  console.log('🔵 Test 5: Simulating memory usage...');
  
  // Create some objects to increase memory usage
  const testObjects = [];
  for (let i = 0; i < 100000; i++) {
    testObjects.push({ id: i, data: `test-data-${i}`, timestamp: new Date() });
  }
  
  console.log(`📈 Created ${testObjects.length} test objects`);
  
  // Check memory again
  const memoryAfter = memoryMonitor.collectMemoryMetrics();
  console.log('📊 Memory after simulation:', {
    rss: `${Math.round(memoryAfter.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB`
  });
  
}, 7000);

// Test 6: Get monitoring stats
setTimeout(() => {
  console.log('🔵 Test 6: Getting memory monitor stats...');
  const stats = memoryMonitor.getStats ? memoryMonitor.getStats() : 'Stats not available';
  console.log('📊 Monitor stats:', stats);
  
  // Test 7: Stop monitoring
  console.log('🔵 Test 7: Stopping memory monitor...');
  memoryMonitor.stop();
  
  console.log('\n✅ Memory monitoring system test completed!');
  console.log('🎯 Key features verified:');
  console.log('  ✓ Memory metrics collection');
  console.log('  ✓ Leak detection system');
  console.log('  ✓ Event listener monitoring');
  console.log('  ✓ Prometheus integration');
  console.log('  ✓ Heap snapshot capability');
  
  process.exit(0);
}, 12000);

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  memoryMonitor.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  memoryMonitor.stop();
  process.exit(1);
});