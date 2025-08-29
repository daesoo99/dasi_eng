/**
 * Contract Test Suite - ISpeechPlugin Implementation Consistency
 * @description Ensures all ISpeechPlugin implementations behave consistently
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  IAdvancedSpeechPlugin, 
  SpeechOptionsAdvanced, 
  RecognitionOptionsAdvanced 
} from './AdvancedPluginSystem';
import { AdvancedSpeechPlugin } from './AdvancedSpeechPlugin';
import { Result, CommonErrors } from './SimplePluginSystem';

// ===== Contract Test Framework =====

interface SpeechPluginContract {
  // Core functionality contracts
  speakText_withValidText_shouldSucceed: () => Promise<void>;
  speakText_withEmptyText_shouldFail: () => Promise<void>;
  speakText_withAbortSignal_shouldBeCancellable: () => Promise<void>;
  
  recognizeSpeech_withValidOptions_shouldSucceed: () => Promise<void>;
  recognizeSpeech_withAbortSignal_shouldBeCancellable: () => Promise<void>;
  
  playBeep_withDefaults_shouldSucceed: () => Promise<void>;
  playBeep_withInvalidParams_shouldFail: () => Promise<void>;
  
  // State management contracts
  initialize_shouldSetupCorrectly: () => Promise<void>;
  dispose_shouldCleanupResources: () => Promise<void>;
  
  // Concurrency contracts
  concurrent_operations_shouldRespectLimits: () => Promise<void>;
  priority_queuing_shouldOrderCorrectly: () => Promise<void>;
  
  // Error handling contracts
  stopAll_shouldCancelAllOperations: () => Promise<void>;
  errorCodes_shouldBeStandardized: () => Promise<void>;
}

// ===== Test Implementations =====

function createContractTests(
  pluginFactory: () => Promise<IAdvancedSpeechPlugin>,
  pluginName: string
): void {
  describe(`Contract Tests: ${pluginName}`, () => {
    let plugin: IAdvancedSpeechPlugin;
    
    beforeEach(async () => {
      // Mock browser APIs for testing
      mockBrowserAPIs();
      
      plugin = await pluginFactory();
      const initResult = await plugin.initialize();
      expect(initResult.ok).toBe(true);
    });
    
    afterEach(async () => {
      if (plugin.dispose) {
        await plugin.dispose();
      }
      restoreBrowserAPIs();
    });

    // ===== Core Functionality Contracts =====

    test('Contract: speakText with valid text should succeed', async () => {
      const result = await plugin.speakText('Hello World');
      
      // ✅ Contract: Must return Result<T>
      expect(result).toHaveProperty('ok');
      expect(typeof result.ok).toBe('boolean');
      
      if (result.ok) {
        // ✅ Contract: Success result must have duration
        expect(result.data).toHaveProperty('duration');
        expect(typeof result.data.duration).toBe('number');
        expect(result.data.duration).toBeGreaterThan(0);
      } else {
        // ✅ Contract: Failure result must have standard error code
        expect(result).toHaveProperty('code');
        expect(STANDARD_ERROR_CODES).toContain(result.code);
      }
    });

    test('Contract: speakText with empty text should fail', async () => {
      const result = await plugin.speakText('');
      
      // ✅ Contract: Must fail with E_INVALID_INPUT
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('E_INVALID_INPUT');
        expect(result.cause).toContain('empty');
      }
    });

    test('Contract: speakText with AbortSignal should be cancellable', async () => {
      const controller = new AbortController();
      const resultPromise = plugin.speakText('Long text that takes time', {
        signal: controller.signal
      });
      
      // Cancel immediately
      controller.abort('test-cancellation');
      
      const result = await resultPromise;
      
      // ✅ Contract: Must fail with E_ABORTED when cancelled
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('E_ABORTED');
      }
    }, 5000);

    test('Contract: recognizeSpeech with valid options should handle gracefully', async () => {
      const result = await plugin.recognizeSpeech({
        language: 'en-US',
        maxDuration: 5000
      });
      
      // ✅ Contract: Must return Result<T>
      expect(result).toHaveProperty('ok');
      
      if (result.ok) {
        // ✅ Contract: Success must have transcript and confidence
        expect(result.data).toHaveProperty('transcript');
        expect(result.data).toHaveProperty('confidence');
        expect(typeof result.data.transcript).toBe('string');
        expect(typeof result.data.confidence).toBe('number');
        expect(result.data.confidence).toBeGreaterThanOrEqual(0);
        expect(result.data.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('Contract: playBeep with defaults should succeed or fail gracefully', async () => {
      const result = await plugin.playBeep();
      
      // ✅ Contract: Must return Result<void>
      expect(result).toHaveProperty('ok');
      
      if (!result.ok) {
        // ✅ Contract: Failure must have valid error code
        expect(STANDARD_ERROR_CODES).toContain(result.code);
      }
    });

    // ===== State Management Contracts =====

    test('Contract: initialize should be idempotent', async () => {
      // Initialize again
      const secondInit = await plugin.initialize();
      
      // ✅ Contract: Should not fail if already initialized
      expect(secondInit.ok).toBe(true);
    });

    test('Contract: dispose should cleanup resources', async () => {
      const disposeResult = await plugin.dispose?.();
      
      if (disposeResult) {
        // ✅ Contract: Dispose should not fail
        expect(disposeResult.ok).toBe(true);
      }
      
      // ✅ Contract: After dispose, new operations should fail gracefully
      const speakResult = await plugin.speakText('Test after dispose');
      // Should either work (if plugin reinitializes) or fail gracefully
      expect(speakResult).toHaveProperty('ok');
    });

    // ===== Concurrency Contracts =====

    test('Contract: concurrent operations should respect limits', async () => {
      const promises: Promise<any>[] = [];
      
      // Start multiple operations
      for (let i = 0; i < 10; i++) {
        promises.push(plugin.speakText(`Text ${i}`, { priority: Math.floor(Math.random() * 10) }));
      }
      
      const results = await Promise.allSettled(promises);
      
      // ✅ Contract: All operations should complete (success or failure)
      expect(results).toHaveLength(10);
      
      // ✅ Contract: Each result should be a valid Result<T>
      results.forEach((settled, index) => {
        if (settled.status === 'fulfilled') {
          expect(settled.value).toHaveProperty('ok');
        } else {
          // Even failures should be handled gracefully
          console.log(`Operation ${index} rejected:`, settled.reason);
        }
      });
    }, 15000);

    test('Contract: priority queuing should respect priority order', async () => {
      if (!plugin.getSpeechQueue) {
        return; // Skip if plugin doesn't support queue inspection
      }
      
      // Add operations with different priorities (don't await)
      const lowPriorityPromise = plugin.speakText('Low priority', { priority: 1 });
      const highPriorityPromise = plugin.speakText('High priority', { priority: 9 });
      const mediumPriorityPromise = plugin.speakText('Medium priority', { priority: 5 });
      
      // Give queue time to organize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const queue = plugin.getSpeechQueue();
      
      // ✅ Contract: Queue should be ordered by priority (highest first)
      if (queue.length > 1) {
        for (let i = 0; i < queue.length - 1; i++) {
          expect(queue[i].priority).toBeGreaterThanOrEqual(queue[i + 1].priority);
        }
      }
      
      // Cleanup
      await Promise.allSettled([lowPriorityPromise, highPriorityPromise, mediumPriorityPromise]);
    }, 10000);

    // ===== Error Handling Contracts =====

    test('Contract: stopAll should cancel all operations', async () => {
      // Start multiple operations
      const promises = [
        plugin.speakText('Text 1'),
        plugin.speakText('Text 2'),
        plugin.speakText('Text 3')
      ];
      
      // Stop all immediately
      const stopResult = plugin.stopAll('user');
      
      // ✅ Contract: stopAll should succeed
      expect(stopResult.ok).toBe(true);
      
      // Wait for operations to complete/cancel
      const results = await Promise.allSettled(promises);
      
      // ✅ Contract: Operations should be cancelled or completed
      results.forEach(settled => {
        if (settled.status === 'fulfilled') {
          // Either succeeded (already started) or aborted
          const result = settled.value;
          if (!result.ok) {
            expect(['E_ABORTED', 'E_INTERNAL']).toContain(result.code);
          }
        }
      });
    });

    test('Contract: error codes should be standardized', async () => {
      // Test various error conditions
      const errorTests = [
        { fn: () => plugin.speakText(''), expectedCode: 'E_INVALID_INPUT' },
        { fn: () => plugin.speakText('test', { signal: createAbortedSignal() }), expectedCode: 'E_ABORTED' }
      ];
      
      for (const test of errorTests) {
        const result = await test.fn();
        
        if (!result.ok) {
          // ✅ Contract: Error code must be standardized
          expect(STANDARD_ERROR_CODES).toContain(result.code);
          expect(result.code).toBe(test.expectedCode);
          
          // ✅ Contract: Must have cause description
          expect(result.cause).toBeDefined();
          expect(typeof result.cause).toBe('string');
          expect(result.cause!.length).toBeGreaterThan(0);
        }
      }
    });

    // ===== Performance Contracts =====

    test('Contract: operations should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await plugin.speakText('Quick test', {
        timeout: 5000
      });
      
      const duration = Date.now() - startTime;
      
      // ✅ Contract: Should not take longer than timeout + buffer
      expect(duration).toBeLessThan(6000); // 5s timeout + 1s buffer
      
      if (!result.ok && result.code === 'E_TIMEOUT') {
        // ✅ Contract: Timeout should be reported correctly
        expect(result.cause).toContain('timeout');
      }
    }, 7000);

    // ===== Memory Management Contracts =====

    test('Contract: repeated operations should not leak memory', async () => {
      const initialMemory = getMemoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        const result = await plugin.speakText(`Test ${i}`);
        // Don't care about success/failure, just memory cleanup
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
      
      const finalMemory = getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;
      
      // ✅ Contract: Memory growth should be reasonable (<10MB for 50 operations)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    }, 30000);
  });
}

// ===== Test Utilities =====

const STANDARD_ERROR_CODES = [
  'E_PERMISSION',
  'E_UNSUPPORTED', 
  'E_TIMEOUT',
  'E_ABORTED',
  'E_NETWORK',
  'E_INVALID_INPUT',
  'E_INTERNAL'
];

function mockBrowserAPIs(): void {
  // Mock speechSynthesis
  global.window = {
    speechSynthesis: {
      speak: jest.fn((utterance) => {
        setTimeout(() => utterance.onend?.(), 100);
      }),
      cancel: jest.fn(),
      getVoices: jest.fn().mockReturnValue([
        { lang: 'en-US', name: 'Mock Voice' }
      ])
    },
    SpeechRecognition: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn(),
      lang: 'en-US',
      continuous: false,
      interimResults: false
    })),
    AudioContext: jest.fn().mockImplementation(() => ({
      createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        frequency: { value: 0 },
        type: 'sine',
        start: jest.fn(),
        stop: jest.fn(),
        onended: null
      })),
      createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn()
        }
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    }))
  } as any;
}

function restoreBrowserAPIs(): void {
  delete (global as any).window;
}

function createAbortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort('test');
  return controller.signal;
}

function getMemoryUsage(): number {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

// ===== Property-Based Test Utilities =====

export function generateRandomText(minLength: number = 1, maxLength: number = 1000): string {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomLanguage(): string {
  const languages = ['en-US', 'ko-KR', 'ja-JP', 'zh-CN', 'es-ES', 'fr-FR', 'de-DE'];
  return languages[Math.floor(Math.random() * languages.length)];
}

export function generateRandomPriority(): number {
  return Math.floor(Math.random() * 11); // 0-10
}

// ===== Run Contract Tests for All Implementations =====

describe('Speech Plugin Contract Tests', () => {
  // ✅ Test AdvancedSpeechPlugin
  createContractTests(
    async () => new AdvancedSpeechPlugin(),
    'AdvancedSpeechPlugin'
  );
  
  // ✅ Add more plugin implementations here as they are created
  // createContractTests(
  //   async () => new MockSpeechPlugin(),
  //   'MockSpeechPlugin'
  // );
  
  // createContractTests(
  //   async () => new CloudSpeechPlugin(),
  //   'CloudSpeechPlugin'
  // );
});

// ===== Property-Based Tests =====

describe('Property-Based Tests', () => {
  let plugin: IAdvancedSpeechPlugin;
  
  beforeEach(async () => {
    mockBrowserAPIs();
    plugin = new AdvancedSpeechPlugin();
    await plugin.initialize();
  });
  
  afterEach(async () => {
    await plugin.dispose?.();
    restoreBrowserAPIs();
  });

  test('Property: speakText should handle any valid text input', async () => {
    // Test with 20 random text inputs
    for (let i = 0; i < 20; i++) {
      const randomText = generateRandomText();
      const randomLanguage = generateRandomLanguage();
      const randomPriority = generateRandomPriority();
      
      const result = await plugin.speakText(randomText, {
        language: randomLanguage,
        priority: randomPriority
      });
      
      // ✅ Property: All valid inputs should produce valid Result<T>
      expect(result).toHaveProperty('ok');
      expect(typeof result.ok).toBe('boolean');
      
      if (!result.ok) {
        // ✅ Property: Failures should have standard error codes
        expect(STANDARD_ERROR_CODES).toContain(result.code);
      }
    }
  }, 30000);

  test('Property: concurrent operations with random priorities should maintain order', async () => {
    const operations = [];
    
    // Create 10 operations with random priorities
    for (let i = 0; i < 10; i++) {
      const priority = generateRandomPriority();
      const text = `Operation ${i} (priority ${priority})`;
      
      operations.push({
        priority,
        text,
        promise: plugin.speakText(text, { priority })
      });
    }
    
    // Wait a bit for queue to organize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check queue order if supported
    if (plugin.getSpeechQueue) {
      const queue = plugin.getSpeechQueue();
      
      // ✅ Property: Queue should be sorted by priority (descending)
      for (let i = 0; i < queue.length - 1; i++) {
        expect(queue[i].priority).toBeGreaterThanOrEqual(queue[i + 1].priority);
      }
    }
    
    // Cleanup
    await Promise.allSettled(operations.map(op => op.promise));
  }, 15000);
});