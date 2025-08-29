/**
 * 고급 Speech 플러그인 - Concurrency Control & Queue Management
 * @description Enhanced speech plugin with queue policies and cancellation
 */

import {
  IAdvancedSpeechPlugin,
  SpeechOptionsAdvanced,
  RecognitionOptionsAdvanced,
  ConcurrencyConfig,
  PluginMetrics,
  StopReason,
  QueuePolicy
} from './AdvancedPluginSystem';

import {
  Result,
  Ok,
  CommonErrors,
  withTimeout
} from './SimplePluginSystem';

// ===== Queue Management Types =====

interface QueuedOperation {
  readonly id: string;
  readonly type: 'tts' | 'stt' | 'beep';
  readonly priority: number;
  readonly createdAt: Date;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
  readonly onCancel?: (reason: string) => void;
  readonly execute: () => Promise<Result<any>>;
  readonly resolve: (result: Result<any>) => void;
  readonly reject: (error: any) => void;
}

interface ActiveOperation {
  readonly id: string;
  readonly type: string;
  readonly startedAt: Date;
  readonly controller: AbortController;
}

// ===== Advanced Speech Plugin Implementation =====

export class AdvancedSpeechPlugin implements IAdvancedSpeechPlugin {
  readonly name = 'advanced-speech';
  readonly version = '2.0.0';
  
  readonly concurrencyConfig: ConcurrencyConfig = {
    maxConcurrency: 3, // Max 3 concurrent speech operations
    queuePolicy: 'priority',
    timeout: 30000 // 30s default timeout
  };

  private synthesis?: SpeechSynthesis;
  private recognition?: SpeechRecognition;
  private audioContext?: AudioContext;

  // Queue Management
  private operationQueue: QueuedOperation[] = [];
  private activeOperations = new Map<string, ActiveOperation>();
  private operationIdCounter = 0;

  // Metrics
  private metrics: PluginMetrics = {
    errorCount: 0,
    lastActivity: new Date(),
    activeOperations: 0
  };

  /**
   * Initialize plugin
   */
  async initialize(config?: Record<string, unknown>): Promise<Result<void>> {
    try {
      const startTime = Date.now();

      // Initialize Speech APIs
      if (!window.speechSynthesis) {
        return CommonErrors.UNSUPPORTED('speechSynthesis');
      }
      this.synthesis = window.speechSynthesis;

      // Speech Recognition (optional)
      const SpeechRecognition = window.SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
      }

      // AudioContext for beeps
      const AudioContext = window.AudioContext || 
                           (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }

      // Apply custom config
      if (config?.maxConcurrency) {
        (this.concurrencyConfig as any).maxConcurrency = config.maxConcurrency as number;
      }
      if (config?.queuePolicy) {
        (this.concurrencyConfig as any).queuePolicy = config.queuePolicy as QueuePolicy;
      }

      this.metrics.loadTime = Date.now() - startTime;
      return Ok(undefined);

    } catch (error) {
      this.metrics.errorCount++;
      return CommonErrors.INTERNAL(`Initialization failed: ${error}`);
    }
  }

  /**
   * Dispose plugin
   */
  async dispose(): Promise<Result<void>> {
    try {
      this.stopAll('dispose');
      
      // Clear queue
      this.clearQueue();
      
      // Close AudioContext
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Dispose failed: ${error}`);
    }
  }

  /**
   * Enhanced text-to-speech with queue management
   */
  async speakText(
    text: string, 
    opts: SpeechOptionsAdvanced = {}
  ): Promise<Result<{ duration: number; queuePosition?: number }>> {
    if (!this.synthesis) {
      return CommonErrors.UNSUPPORTED('speechSynthesis');
    }

    if (!text.trim()) {
      return CommonErrors.INVALID_INPUT('text cannot be empty');
    }

    // Create queued operation
    const operation = this.createQueuedOperation(
      'tts',
      opts.priority || 5,
      opts.timeout,
      opts.signal,
      opts.onCancel,
      async () => this.executeSpeakText(text, opts)
    );

    return this.enqueueOperation(operation);
  }

  /**
   * Enhanced speech recognition with queue management
   */
  async recognizeSpeech(
    opts: RecognitionOptionsAdvanced = {}
  ): Promise<Result<{ transcript: string; confidence: number; queuePosition?: number }>> {
    if (!this.recognition) {
      return CommonErrors.UNSUPPORTED('speechRecognition');
    }

    const operation = this.createQueuedOperation(
      'stt',
      opts.priority || 8, // STT typically has higher priority
      opts.timeout,
      opts.signal,
      opts.onCancel,
      async () => this.executeRecognizeSpeech(opts)
    );

    return this.enqueueOperation(operation);
  }

  /**
   * Enhanced beep with queue management
   */
  async playBeep(
    frequency = 800,
    duration = 200,
    opts: { priority?: number; signal?: AbortSignal; onCancel?: () => void } = {}
  ): Promise<Result<void>> {
    if (!this.audioContext) {
      return CommonErrors.UNSUPPORTED('audioContext');
    }

    const operation = this.createQueuedOperation(
      'beep',
      opts.priority || 3, // Lower priority for beeps
      5000, // 5s timeout for beeps
      opts.signal,
      opts.onCancel,
      async () => this.executePlayBeep(frequency, duration)
    );

    return this.enqueueOperation(operation);
  }

  /**
   * Stop all operations with reason
   */
  stopAll(reason: StopReason): Result<void> {
    try {
      // Stop all active operations
      for (const [id, active] of this.activeOperations) {
        active.controller.abort(reason);
        this.activeOperations.delete(id);
      }

      // Cancel queued operations
      while (this.operationQueue.length > 0) {
        const op = this.operationQueue.shift()!;
        op.onCancel?.(reason);
        op.resolve(CommonErrors.ABORTED(reason));
      }

      // Stop speech synthesis
      this.synthesis?.cancel();

      this.metrics.activeOperations = 0;
      return Ok(undefined);

    } catch (error) {
      this.metrics.errorCount++;
      return CommonErrors.INTERNAL(`Stop failed: ${error}`);
    }
  }

  /**
   * Clear operation queue
   */
  clearQueue(): Result<void> {
    try {
      while (this.operationQueue.length > 0) {
        const op = this.operationQueue.shift()!;
        op.onCancel?.('queue-cleared');
        op.resolve(CommonErrors.ABORTED('queue-cleared'));
      }
      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Clear queue failed: ${error}`);
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.operationQueue.length;
  }

  /**
   * Get active operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.values())
      .map(op => `${op.type}:${op.id} (${Date.now() - op.startedAt.getTime()}ms)`);
  }

  /**
   * Get speech queue details
   */
  getSpeechQueue(): Array<{ id: string; text?: string; priority: number }> {
    return this.operationQueue
      .filter(op => op.type === 'tts')
      .map(op => ({
        id: op.id,
        text: `${op.type} operation`, // Don't expose actual text for privacy
        priority: op.priority
      }));
  }

  /**
   * Get plugin metrics
   */
  getMetrics(): PluginMetrics {
    return {
      ...this.metrics,
      activeOperations: this.activeOperations.size,
      lastActivity: new Date()
    };
  }

  // ===== Private Implementation Methods =====

  private createQueuedOperation(
    type: 'tts' | 'stt' | 'beep',
    priority: number,
    timeout?: number,
    signal?: AbortSignal,
    onCancel?: (reason: string) => void,
    executor: () => Promise<Result<any>>
  ): QueuedOperation {
    const id = `${type}-${++this.operationIdCounter}`;
    
    return {
      id,
      type,
      priority: Math.max(0, Math.min(10, priority)), // Clamp to 0-10
      createdAt: new Date(),
      timeout,
      signal,
      onCancel,
      execute: executor,
      resolve: () => {}, // Will be set in enqueueOperation
      reject: () => {}   // Will be set in enqueueOperation
    };
  }

  private async enqueueOperation(operation: QueuedOperation): Promise<Result<any>> {
    return new Promise((resolve, reject) => {
      // Set resolve/reject
      (operation as any).resolve = resolve;
      (operation as any).reject = reject;

      // Check if external signal is already aborted
      if (operation.signal?.aborted) {
        const reason = (operation.signal as any).reason || 'pre-aborted';
        operation.onCancel?.(reason);
        resolve(CommonErrors.ABORTED(reason));
        return;
      }

      // Handle external cancellation
      operation.signal?.addEventListener('abort', () => {
        this.removeFromQueue(operation.id);
        const reason = (operation.signal as any).reason || 'external-abort';
        operation.onCancel?.(reason);
        resolve(CommonErrors.ABORTED(reason));
      });

      // Add to queue with priority sorting
      this.operationQueue.push(operation);
      this.sortQueue();

      // Try to process queue
      this.processQueue();

      // Return queue position (for debugging)
      const position = this.operationQueue.findIndex(op => op.id === operation.id);
      if (position !== -1) {
        console.log(`[${operation.type}] Queued at position ${position + 1}`);
      }
    });
  }

  private sortQueue(): void {
    switch (this.concurrencyConfig.queuePolicy) {
      case 'priority':
        this.operationQueue.sort((a, b) => b.priority - a.priority);
        break;
      case 'fifo':
        this.operationQueue.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'lifo':
        this.operationQueue.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'concurrent':
        // No sorting needed for concurrent
        break;
    }
  }

  private async processQueue(): Promise<void> {
    // Process queue until we hit concurrency limit
    while (
      this.operationQueue.length > 0 && 
      this.activeOperations.size < this.concurrencyConfig.maxConcurrency
    ) {
      const operation = this.operationQueue.shift()!;
      
      // Skip if operation was cancelled while queued
      if (operation.signal?.aborted) {
        continue;
      }

      // Start execution
      this.executeOperation(operation);
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const controller = new AbortController();
    const active: ActiveOperation = {
      id: operation.id,
      type: operation.type,
      startedAt: new Date(),
      controller
    };

    this.activeOperations.set(operation.id, active);
    this.metrics.activeOperations = this.activeOperations.size;

    try {
      // Create timeout if specified
      const timeoutMs = operation.timeout || this.concurrencyConfig.timeout || 30000;
      
      // Execute with timeout and cancellation support
      const result = await withTimeout(
        operation.execute(),
        timeoutMs,
        operation.signal
      );

      // Check if operation was cancelled during execution
      if (controller.signal.aborted) {
        const reason = (controller.signal as any).reason || 'execution-aborted';
        operation.onCancel?.(reason);
        operation.resolve(CommonErrors.ABORTED(reason));
        return;
      }

      operation.resolve(result);

    } catch (error) {
      this.metrics.errorCount++;
      operation.resolve(CommonErrors.INTERNAL(`Execution failed: ${error}`));
    } finally {
      this.activeOperations.delete(operation.id);
      this.metrics.activeOperations = this.activeOperations.size;
      this.metrics.lastActivity = new Date();
      
      // Process more queued operations
      this.processQueue();
    }
  }

  private removeFromQueue(operationId: string): boolean {
    const index = this.operationQueue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  // ===== Core Speech Operations =====

  private async executeSpeakText(
    text: string, 
    opts: SpeechOptionsAdvanced
  ): Promise<Result<{ duration: number }>> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      if (opts.language) utterance.lang = opts.language;
      if (opts.rate) utterance.rate = Math.max(0.1, Math.min(10, opts.rate));

      let completed = false;

      utterance.onend = () => {
        if (completed) return;
        completed = true;
        resolve(Ok({ duration: Date.now() - startTime }));
      };

      utterance.onerror = (event) => {
        if (completed) return;
        completed = true;
        resolve(CommonErrors.INTERNAL(`TTS error: ${event.error}`));
      };

      try {
        this.synthesis!.speak(utterance);
      } catch (error) {
        if (completed) return;
        completed = true;
        resolve(CommonErrors.INTERNAL(`Speech failed: ${error}`));
      }
    });
  }

  private async executeRecognizeSpeech(
    opts: RecognitionOptionsAdvanced
  ): Promise<Result<{ transcript: string; confidence: number }>> {
    return new Promise((resolve) => {
      const recognition = new (window.SpeechRecognition || 
                              (window as any).webkitSpeechRecognition)();
      
      recognition.lang = opts.language || 'ko-KR';
      recognition.continuous = opts.continuous || false;
      recognition.interimResults = true;

      let finalTranscript = '';
      let maxConfidence = 0;
      let completed = false;

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            maxConfidence = Math.max(maxConfidence, result[0].confidence);
          }
        }
      };

      recognition.onend = () => {
        if (completed) return;
        completed = true;
        
        if (finalTranscript.trim()) {
          resolve(Ok({
            transcript: finalTranscript.trim(),
            confidence: maxConfidence
          }));
        } else {
          resolve(CommonErrors.INVALID_INPUT('no speech detected'));
        }
      };

      recognition.onerror = (event) => {
        if (completed) return;
        completed = true;
        resolve(CommonErrors.INTERNAL(`STT error: ${event.error}`));
      };

      try {
        recognition.start();
      } catch (error) {
        if (completed) return;
        completed = true;
        resolve(CommonErrors.INTERNAL(`Recognition failed: ${error}`));
      }
    });
  }

  private async executePlayBeep(
    frequency: number, 
    duration: number
  ): Promise<Result<void>> {
    try {
      const context = this.audioContext!;
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
      
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
      
      return new Promise<Result<void>>((resolve) => {
        oscillator.onended = () => resolve(Ok(undefined));
      });
      
    } catch (error) {
      return CommonErrors.INTERNAL(`Beep failed: ${error}`);
    }
  }
}