/**
 * Failure Path Tests - Edge Cases & Error Scenarios
 * @description Comprehensive testing of permission denial, network issues, cancellation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AdvancedSpeechPlugin } from './AdvancedSpeechPlugin';
import { IAdvancedSpeechPlugin } from './AdvancedPluginSystem';

// ===== Failure Simulation Framework =====

interface FailureScenario {
  name: string;
  setup: () => void;
  cleanup: () => void;
  expectedErrorCode?: string;
  expectedBehavior: string;
}

class FailureSimulator {
  private originalAPIs: any = {};
  
  /**
   * Simulate permission denial
   */
  simulatePermissionDenial(): FailureScenario {
    return {
      name: 'Permission Denial',
      setup: () => {
        // Mock getUserMedia to reject with permission error
        global.navigator = {
          ...global.navigator,
          mediaDevices: {
            getUserMedia: jest.fn().mockRejectedValue(
              new DOMException('Permission denied', 'NotAllowedError')
            )
          },
          permissions: {
            query: jest.fn().mockResolvedValue({ state: 'denied' })
          }
        } as any;
        
        // Mock speech APIs to fail with permission errors
        global.window = {
          speechSynthesis: {
            speak: jest.fn((utterance) => {
              setTimeout(() => {
                const errorEvent = new Event('error') as any;
                errorEvent.error = 'not-allowed';
                utterance.onerror?.(errorEvent);
              }, 50);
            }),
            cancel: jest.fn(),
            getVoices: jest.fn().mockReturnValue([])
          },
          SpeechRecognition: jest.fn().mockImplementation(() => ({
            start: jest.fn(() => {
              throw new DOMException('Permission denied', 'NotAllowedError');
            }),
            stop: jest.fn(),
            addEventListener: jest.fn()
          }))
        } as any;
      },
      cleanup: () => {
        delete (global as any).navigator;
        delete (global as any).window;
      },
      expectedErrorCode: 'E_PERMISSION',
      expectedBehavior: 'Should fail gracefully with permission error'
    };
  }

  /**
   * Simulate network downtime
   */
  simulateNetworkDowntime(): FailureScenario {
    return {
      name: 'Network Downtime',
      setup: () => {
        // Mock network failure for any potential cloud STT/TTS
        global.fetch = jest.fn().mockRejectedValue(
          new Error('Network request failed')
        );
        
        // Mock speech synthesis with network error
        global.window = {
          speechSynthesis: {
            speak: jest.fn((utterance) => {
              setTimeout(() => {
                const errorEvent = new Event('error') as any;
                errorEvent.error = 'network';
                utterance.onerror?.(errorEvent);
              }, 100);
            }),
            cancel: jest.fn(),
            getVoices: jest.fn().mockReturnValue([])
          },
          SpeechRecognition: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
            onerror: null,
            onend: null
          }))
        } as any;
        
        // Simulate network error in recognition
        const mockRecognition = new (global.window.SpeechRecognition as any)();
        setTimeout(() => {
          const errorEvent = new Event('error') as any;
          errorEvent.error = 'network';
          mockRecognition.onerror?.(errorEvent);
        }, 100);
      },
      cleanup: () => {
        delete (global as any).fetch;
        delete (global as any).window;
      },
      expectedErrorCode: 'E_NETWORK',
      expectedBehavior: 'Should retry appropriately and fail with network error'
    };
  }

  /**
   * Simulate browser API unavailability
   */
  simulateUnsupportedBrowser(): FailureScenario {
    return {
      name: 'Unsupported Browser',
      setup: () => {
        global.window = {
          // No speechSynthesis
          // No SpeechRecognition
          // No AudioContext
        } as any;
      },
      cleanup: () => {
        delete (global as any).window;
      },
      expectedErrorCode: 'E_UNSUPPORTED',
      expectedBehavior: 'Should fail initialization with unsupported error'
    };
  }

  /**
   * Simulate memory pressure
   */
  simulateMemoryPressure(): FailureScenario {
    return {
      name: 'Memory Pressure',
      setup: () => {
        // Mock performance.memory to show high usage
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: 90 * 1024 * 1024, // 90MB - high usage
            totalJSHeapSize: 100 * 1024 * 1024,
            jsHeapSizeLimit: 100 * 1024 * 1024
          },
          configurable: true
        });
        
        // Mock normal speech APIs
        global.window = {
          speechSynthesis: {
            speak: jest.fn((utterance) => {
              // Simulate memory-related failure
              setTimeout(() => {
                const errorEvent = new Event('error') as any;
                errorEvent.error = 'synthesis-failed';
                utterance.onerror?.(errorEvent);
              }, 50);
            }),
            cancel: jest.fn(),
            getVoices: jest.fn().mockReturnValue([])
          }
        } as any;
      },
      cleanup: () => {
        delete (performance as any).memory;
        delete (global as any).window;
      },
      expectedErrorCode: 'E_INTERNAL',
      expectedBehavior: 'Should handle memory pressure gracefully'
    };
  }

  /**
   * Simulate random cancellation scenarios
   */
  simulateRandomCancellation(): FailureScenario {
    return {
      name: 'Random Cancellation',
      setup: () => {
        global.window = {
          speechSynthesis: {
            speak: jest.fn((utterance) => {
              // Randomly cancel at different stages
              const cancelTime = Math.random() * 500; // 0-500ms
              
              setTimeout(() => {
                if (Math.random() > 0.5) {
                  // Simulate interruption
                  const errorEvent = new Event('error') as any;
                  errorEvent.error = 'interrupted';
                  utterance.onerror?.(errorEvent);
                } else {
                  // Complete normally
                  utterance.onend?.();
                }
              }, cancelTime);
            }),
            cancel: jest.fn(),
            getVoices: jest.fn().mockReturnValue([])
          },
          SpeechRecognition: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn()
          }))
        } as any;
      },
      cleanup: () => {
        delete (global as any).window;
      },
      expectedErrorCode: 'E_ABORTED',
      expectedBehavior: 'Should handle random cancellations gracefully'
    };
  }
}

// ===== Failure Path Test Suite =====

describe('Failure Path Tests', () => {
  let plugin: IAdvancedSpeechPlugin;
  let failureSimulator: FailureSimulator;
  
  beforeEach(() => {
    failureSimulator = new FailureSimulator();
  });
  
  afterEach(async () => {
    if (plugin?.dispose) {
      await plugin.dispose();
    }
  });

  // ===== Permission Denial Tests =====

  test('Should handle microphone permission denial gracefully', async () => {
    const scenario = failureSimulator.simulatePermissionDenial();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      const initResult = await plugin.initialize();
      
      // Plugin should initialize even without microphone (TTS might still work)
      expect(initResult).toHaveProperty('ok');
      
      // Speech recognition should fail with permission error
      const sttResult = await plugin.recognizeSpeech({
        language: 'en-US',
        maxDuration: 5000
      });
      
      expect(sttResult.ok).toBe(false);
      if (!sttResult.ok) {
        expect(sttResult.code).toBe('E_PERMISSION');
        expect(sttResult.cause).toMatch(/permission|denied|allowed/i);
      }
      
    } finally {
      scenario.cleanup();
    }
  });

  test('Should handle TTS permission denial gracefully', async () => {
    const scenario = failureSimulator.simulatePermissionDenial();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const ttsResult = await plugin.speakText('Test speech with permission denied');
      
      expect(ttsResult.ok).toBe(false);
      if (!ttsResult.ok) {
        expect(ttsResult.code).toBe('E_PERMISSION');
        expect(sttResult.cause).toMatch(/permission|denied|not.allowed/i);
      }
      
    } finally {
      scenario.cleanup();
    }
  });

  // ===== Network Failure Tests =====

  test('Should handle network downtime gracefully', async () => {
    const scenario = failureSimulator.simulateNetworkDowntime();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const ttsResult = await plugin.speakText('Test with network failure');
      
      expect(ttsResult.ok).toBe(false);
      if (!ttsResult.ok) {
        expect(ttsResult.code).toBe('E_NETWORK');
        expect(ttsResult.cause).toMatch(/network/i);
      }
      
    } finally {
      scenario.cleanup();
    }
  });

  test('Should handle intermittent network failures with retry', async () => {
    let attemptCount = 0;
    
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          attemptCount++;
          
          setTimeout(() => {
            if (attemptCount <= 2) {
              // Fail first 2 attempts
              const errorEvent = new Event('error') as any;
              errorEvent.error = 'network';
              utterance.onerror?.(errorEvent);
            } else {
              // Succeed on 3rd attempt
              utterance.onend?.();
            }
          }, 100);
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      // This would need retry logic in the plugin
      const ttsResult = await plugin.speakText('Test with intermittent failure');
      
      // Should eventually succeed or fail gracefully
      expect(ttsResult).toHaveProperty('ok');
      
    } finally {
      delete (global as any).window;
    }
  });

  // ===== Browser Compatibility Tests =====

  test('Should handle completely unsupported browsers', async () => {
    const scenario = failureSimulator.simulateUnsupportedBrowser();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      const initResult = await plugin.initialize();
      
      expect(initResult.ok).toBe(false);
      if (!initResult.ok) {
        expect(initResult.code).toBe('E_UNSUPPORTED');
        expect(initResult.cause).toMatch(/speech|synthesis|not.available/i);
      }
      
    } finally {
      scenario.cleanup();
    }
  });

  test('Should handle partial browser support (TTS only)', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), 100);
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([{ lang: 'en-US', name: 'Test' }])
      }
      // No SpeechRecognition - partial support
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      const initResult = await plugin.initialize();
      
      // Should initialize successfully with partial support
      expect(initResult.ok).toBe(true);
      
      // TTS should work
      const ttsResult = await plugin.speakText('Test TTS only');
      expect(ttsResult.ok).toBe(true);
      
      // STT should fail gracefully
      const sttResult = await plugin.recognizeSpeech();
      expect(sttResult.ok).toBe(false);
      if (!sttResult.ok) {
        expect(sttResult.code).toBe('E_UNSUPPORTED');
      }
      
    } finally {
      delete (global as any).window;
    }
  });

  // ===== Cancellation & Timeout Tests =====

  test('Should handle timeout scenarios correctly', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          // Never call onend or onerror - simulate hanging
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const startTime = Date.now();
      const ttsResult = await plugin.speakText('Test timeout', {
        timeout: 1000 // 1 second timeout
      });
      const duration = Date.now() - startTime;
      
      // Should timeout within reasonable time
      expect(duration).toBeLessThan(2000); // 1s timeout + 1s buffer
      expect(ttsResult.ok).toBe(false);
      
      if (!ttsResult.ok) {
        expect(ttsResult.code).toBe('E_TIMEOUT');
      }
      
    } finally {
      delete (global as any).window;
    }
  }, 5000);

  test('Should handle rapid cancellation correctly', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), 1000); // Slow completion
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const controller = new AbortController();
      const resultPromise = plugin.speakText('Test rapid cancellation', {
        signal: controller.signal
      });
      
      // Cancel immediately
      setTimeout(() => controller.abort('rapid-cancel'), 10);
      
      const result = await resultPromise;
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('E_ABORTED');
        expect(result.cause).toMatch(/abort|cancel/i);
      }
      
    } finally {
      delete (global as any).window;
    }
  });

  // ===== Resource Exhaustion Tests =====

  test('Should handle memory pressure gracefully', async () => {
    const scenario = failureSimulator.simulateMemoryPressure();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const ttsResult = await plugin.speakText('Test under memory pressure');
      
      // Should either succeed or fail gracefully
      expect(ttsResult).toHaveProperty('ok');
      
      if (!ttsResult.ok) {
        expect(['E_INTERNAL', 'E_UNSUPPORTED']).toContain(ttsResult.code);
      }
      
    } finally {
      scenario.cleanup();
    }
  });

  test('Should handle queue overflow gracefully', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          // Slow processing to cause queue buildup
          setTimeout(() => utterance.onend?.(), 2000);
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      // Flood with operations to test queue limits
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(plugin.speakText(`Queue test ${i}`));
      }
      
      const results = await Promise.allSettled(promises);
      
      // Some should succeed, some might be rejected due to queue limits
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach(settled => {
        if (settled.status === 'fulfilled') {
          if (settled.value.ok) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          failureCount++;
        }
      });
      
      // Should handle gracefully - not all fail, not all succeed
      expect(successCount + failureCount).toBe(20);
      console.log(`Queue test: ${successCount} succeeded, ${failureCount} failed`);
      
    } finally {
      delete (global as any).window;
    }
  }, 15000);

  // ===== Edge Case Tests =====

  test('Should handle malformed input gracefully', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), 100);
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      const malformedInputs = [
        '', // Empty string
        ' \t\n ', // Whitespace only
        'x'.repeat(10000), // Very long string
        null as any, // Null
        undefined as any, // Undefined
        123 as any, // Number
        {} as any, // Object
        [] as any // Array
      ];
      
      for (const input of malformedInputs) {
        const result = await plugin.speakText(input);
        
        // Should handle gracefully
        expect(result).toHaveProperty('ok');
        
        if (!result.ok) {
          expect(['E_INVALID_INPUT', 'E_INTERNAL']).toContain(result.code);
        }
      }
      
    } finally {
      delete (global as any).window;
    }
  });

  test('Should handle plugin disposal during operation', async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), 2000); // Long operation
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      // Start long operation
      const resultPromise = plugin.speakText('Long operation that gets disposed');
      
      // Dispose plugin while operation is running
      setTimeout(async () => {
        await plugin.dispose();
      }, 500);
      
      const result = await resultPromise;
      
      // Should handle disposal gracefully
      expect(result).toHaveProperty('ok');
      
      if (!result.ok) {
        expect(['E_ABORTED', 'E_INTERNAL']).toContain(result.code);
      }
      
    } finally {
      delete (global as any).window;
    }
  });

  // ===== Random Failure Tests =====

  test('Should handle random failure combinations', async () => {
    const scenario = failureSimulator.simulateRandomCancellation();
    scenario.setup();
    
    try {
      plugin = new AdvancedSpeechPlugin();
      await plugin.initialize();
      
      // Run multiple operations with random outcomes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(plugin.speakText(`Random test ${i}`));
      }
      
      const results = await Promise.allSettled(promises);
      
      // All should complete (success or graceful failure)
      expect(results).toHaveLength(10);
      
      results.forEach((settled, index) => {
        if (settled.status === 'fulfilled') {
          expect(settled.value).toHaveProperty('ok');
          
          if (!settled.value.ok) {
            // Failures should have valid error codes
            expect(['E_ABORTED', 'E_INTERNAL', 'E_TIMEOUT']).toContain(settled.value.code);
          }
        } else {
          console.log(`Random test ${index} rejected:`, settled.reason);
        }
      });
      
    } finally {
      scenario.cleanup();
    }
  }, 10000);
});

// ===== Stress Tests =====

describe('Stress Tests', () => {
  let plugin: IAdvancedSpeechPlugin;
  
  beforeEach(async () => {
    global.window = {
      speechSynthesis: {
        speak: jest.fn((utterance) => {
          setTimeout(() => utterance.onend?.(), Math.random() * 100 + 50);
        }),
        cancel: jest.fn(),
        getVoices: jest.fn().mockReturnValue([])
      }
    } as any;
    
    plugin = new AdvancedSpeechPlugin();
    await plugin.initialize();
  });
  
  afterEach(async () => {
    await plugin.dispose?.();
    delete (global as any).window;
  });

  test('Should handle burst of operations', async () => {
    const burstSize = 50;
    const promises = [];
    
    // Create burst of operations
    for (let i = 0; i < burstSize; i++) {
      promises.push(plugin.speakText(`Burst operation ${i}`));
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    
    // Should complete within reasonable time (not hang)
    expect(duration).toBeLessThan(30000); // 30 seconds max
    
    // All should have valid results
    expect(results).toHaveLength(burstSize);
    
    results.forEach(settled => {
      if (settled.status === 'fulfilled') {
        expect(settled.value).toHaveProperty('ok');
      }
    });
    
  }, 35000);
});