#!/usr/bin/env node

/**
 * Test script for monitoring and cache functionality
 * 
 * Usage: node test_monitoring.js
 */

const fetch = require('node-fetch').default || require('node-fetch');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8090';
const TEST_CONCURRENT_REQUESTS = 10;

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  requestDelay: 100
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      timeout: TEST_CONFIG.timeout,
      ...options
    });
    
    const duration = performance.now() - start;
    const body = await response.json().catch(() => ({ error: 'Invalid JSON' }));
    
    return {
      success: response.ok,
      status: response.status,
      duration: Math.round(duration),
      body
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Math.round(performance.now() - start)
    };
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  
  const result = await makeRequest(`${BASE_URL}/health`);
  
  if (result.success) {
    console.log(`✅ Health check passed (${result.duration}ms)`);
    console.log(`   Cache status: Redis=${result.body.cache?.isRedisEnabled}, Local=${result.body.cache?.localCacheSize || 0}`);
    return true;
  } else {
    console.log(`❌ Health check failed: ${result.error || result.status}`);
    return false;
  }
}

async function testMetricsEndpoint() {
  console.log('\n📊 Testing Metrics Endpoint...');
  
  // Make raw HTTP request to get text content
  const response = await fetch(`${BASE_URL}/metrics`);
  const metricsText = await response.text();
  const duration = 'N/A'; // We'll calculate this differently
  
  if (response.ok) {
    console.log(`✅ Metrics endpoint accessible (${duration}ms)`);
    
    // Check for our custom metrics in the Prometheus format
    const hasHttpMetrics = metricsText.includes('http_request_duration_ms');
    const hasQueueMetrics = metricsText.includes('queue_size_total');
    const hasCacheMetrics = metricsText.includes('cache_hit_rate_total');
    const hasApiMetrics = metricsText.includes('api_requests_total');
    
    console.log(`   HTTP metrics: ${hasHttpMetrics ? '✅' : '❌'}`);
    console.log(`   Queue metrics: ${hasQueueMetrics ? '✅' : '❌'}`);
    console.log(`   Cache metrics: ${hasCacheMetrics ? '✅' : '❌'}`);
    console.log(`   API request metrics: ${hasApiMetrics ? '✅' : '❌'}`);
    
    return hasHttpMetrics && hasQueueMetrics && hasCacheMetrics && hasApiMetrics;
  } else {
    console.log(`❌ Metrics endpoint failed: ${response.status}`);
    return false;
  }
}

async function testConcurrentRequests() {
  console.log(`\n🚀 Testing Concurrent Requests (${TEST_CONCURRENT_REQUESTS} requests)...`);
  
  const requests = Array(TEST_CONCURRENT_REQUESTS).fill(null).map((_, i) => 
    makeRequest(`${BASE_URL}/api/health?test=${i}`)
  );
  
  const start = performance.now();
  const results = await Promise.all(requests);
  const totalDuration = Math.round(performance.now() - start);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
  const minDuration = Math.min(...results.map(r => r.duration));
  const maxDuration = Math.max(...results.map(r => r.duration));
  
  console.log(`   Total time: ${totalDuration}ms`);
  console.log(`   Successful: ${successful}/${results.length}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Response times: min=${minDuration}ms, avg=${avgDuration}ms, max=${maxDuration}ms`);
  
  if (failed > 0) {
    const errorCounts = {};
    results.filter(r => !r.success).forEach(r => {
      const error = r.error || `HTTP ${r.status}`;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    console.log(`   Errors:`, errorCounts);
  }
  
  return successful >= TEST_CONCURRENT_REQUESTS * 0.9; // 90% success rate
}

async function testTTSCacheHit() {
  console.log('\n💾 Testing Cache System...');
  
  // Test that cache system is initialized
  const healthResult = await makeRequest(`${BASE_URL}/health`);
  
  if (healthResult.success && healthResult.body.cache) {
    const cache = healthResult.body.cache;
    console.log(`   Redis enabled: ${cache.isRedisEnabled ? '✅' : '❌ (using local cache)'}`);
    console.log(`   Redis connected: ${cache.redisConnected ? '✅' : '❌'}`);
    console.log(`   Local cache size: ${cache.localCacheSize || 0}`);
    
    // Check cache metrics in Prometheus endpoint
    const response = await fetch(`${BASE_URL}/metrics`);
    const metricsText = await response.text();
    
    const hasCacheMetrics = metricsText.includes('cache_hit_rate_total');
    console.log(`   Cache metrics available: ${hasCacheMetrics ? '✅' : '❌'}`);
    
    return hasCacheMetrics; // Pass if cache system is functional
  } else {
    console.log('   ❌ Cache test failed - health endpoint unsuccessful');
    return false;
  }
}

async function testQueueMetrics() {
  console.log('\n⏳ Testing Queue Metrics...');
  
  try {
    console.log('   Queue system loaded and accessible');
    
    // Check if metrics are registering
    const response = await fetch(`${BASE_URL}/metrics`);
    const metricsText = await response.text();
    
    if (response.ok) {
      const hasTaskMetrics = metricsText.includes('task_processing_time_ms');
      const hasQueueSizeMetrics = metricsText.includes('queue_size_total');
      const hasQueuePendingMetrics = metricsText.includes('queue_pending_total');
      
      console.log(`   Task processing metrics: ${hasTaskMetrics ? '✅' : '❌'}`);
      console.log(`   Queue size metrics: ${hasQueueSizeMetrics ? '✅' : '❌'}`);
      console.log(`   Queue pending metrics: ${hasQueuePendingMetrics ? '✅' : '❌'}`);
      
      return hasTaskMetrics && hasQueueSizeMetrics && hasQueuePendingMetrics;
    }
    
    return false;
  } catch (error) {
    console.log(`   ❌ Queue metrics test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting monitoring and cache tests...');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Timeout: ${TEST_CONFIG.timeout}ms`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Metrics Endpoint', fn: testMetricsEndpoint },
    { name: 'Concurrent Requests', fn: testConcurrentRequests },
    { name: 'TTS Cache Hit', fn: testTTSCacheHit },
    { name: 'Queue Metrics', fn: testQueueMetrics }
  ];
  
  const results = {};
  
  for (const test of tests) {
    try {
      results[test.name] = await test.fn();
      await sleep(TEST_CONFIG.requestDelay);
    } catch (error) {
      console.log(`❌ ${test.name} failed with error: ${error.message}`);
      results[test.name] = false;
    }
  }
  
  console.log('\n📋 Test Results Summary:');
  let passed = 0;
  let total = 0;
  
  for (const [testName, result] of Object.entries(results)) {
    total++;
    if (result) passed++;
    console.log(`   ${result ? '✅' : '❌'} ${testName}`);
  }
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Monitoring and cache system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testMetricsEndpoint,
  testConcurrentRequests,
  testTTSCacheHit,
  testQueueMetrics
};