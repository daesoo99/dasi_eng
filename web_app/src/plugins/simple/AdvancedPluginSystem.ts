/**
 * 고급 플러그인 시스템 - Dynamic Loading & Concurrency Control
 * @description Discovery/Loading Strategy + Cancellation/Concurrency 개선
 */

import { 
  Result, 
  Ok, 
  Err, 
  ErrCode, 
  CommonErrors,
  ISimplePlugin 
} from './SimplePluginSystem';

// ===== Enhanced Plugin Interfaces =====

export type PluginLoadingStrategy = 'static' | 'lazy' | 'preload';
export type QueuePolicy = 'fifo' | 'lifo' | 'priority' | 'concurrent';
export type StopReason = 'user' | 'navigate' | 'error' | 'dispose' | 'timeout' | 'memory';

export interface PluginMetrics {
  loadTime?: number;
  memoryUsage?: number;
  errorCount: number;
  lastActivity: Date;
  activeOperations: number;
}

export interface ConcurrencyConfig {
  readonly maxConcurrency: number;
  readonly queuePolicy: QueuePolicy;
  readonly timeout?: number;
}

export interface IAdvancedPlugin extends ISimplePlugin {
  // Concurrency Control
  readonly concurrencyConfig?: ConcurrencyConfig;
  
  // Enhanced Lifecycle with Metrics
  getMetrics(): PluginMetrics;
  
  // Enhanced Stop Control
  stopAll(reason: StopReason): Result<void>;
  
  // Queue Management
  getQueueSize(): number;
  clearQueue(): Result<void>;
}

// ===== Enhanced Speech Plugin Interface =====

export interface SpeechOptionsAdvanced {
  readonly language?: string;
  readonly rate?: number;
  readonly priority?: number; // 0-10, 10 = highest
  readonly signal?: AbortSignal;
  readonly onCancel?: (reason: string) => void;
  readonly timeout?: number;
}

export interface RecognitionOptionsAdvanced {
  readonly language?: string;
  readonly maxDuration?: number;
  readonly continuous?: boolean;
  readonly priority?: number;
  readonly signal?: AbortSignal;
  readonly onCancel?: (reason: string) => void;
  readonly timeout?: number;
}

export interface IAdvancedSpeechPlugin extends IAdvancedPlugin {
  // Enhanced TTS with concurrency
  speakText(
    text: string, 
    opts?: SpeechOptionsAdvanced
  ): Promise<Result<{ duration: number; queuePosition?: number }>>;
  
  // Enhanced STT with concurrency
  recognizeSpeech(
    opts?: RecognitionOptionsAdvanced
  ): Promise<Result<{ transcript: string; confidence: number; queuePosition?: number }>>;
  
  // Beep with concurrency
  playBeep(
    frequency?: number, 
    duration?: number,
    opts?: { priority?: number; signal?: AbortSignal; onCancel?: () => void }
  ): Promise<Result<void>>;
  
  // Queue inspection
  getActiveOperations(): string[];
  getSpeechQueue(): Array<{ id: string; text: string; priority: number }>;
}

// ===== Plugin Factory & Loader System =====

export type PluginFactory<T extends IAdvancedPlugin> = () => Promise<T>;
export type PluginLoader<T extends IAdvancedPlugin> = () => Promise<{ default: new() => T }>;

export interface PluginRegistration<T extends IAdvancedPlugin> {
  readonly name: string;
  readonly factory?: PluginFactory<T>;
  readonly loader?: PluginLoader<T>;
  readonly strategy: PluginLoadingStrategy;
  readonly bundleChunk?: string; // For code-splitting
  readonly preloadCondition?: () => boolean;
}

// ===== Dynamic Plugin Registry =====

export class DynamicPluginRegistry {
  private registrations = new Map<string, PluginRegistration<any>>();
  private loadedPlugins = new Map<string, IAdvancedPlugin>();
  private loadingPromises = new Map<string, Promise<IAdvancedPlugin>>();
  private metrics = new Map<string, PluginMetrics>();

  /**
   * Register plugin with dynamic loading capability
   */
  register<T extends IAdvancedPlugin>(
    registration: PluginRegistration<T>
  ): Result<void> {
    if (this.registrations.has(registration.name)) {
      return CommonErrors.INVALID_INPUT(`Plugin '${registration.name}' already registered`);
    }

    // Validate registration
    if (!registration.factory && !registration.loader) {
      return CommonErrors.INVALID_INPUT('Either factory or loader must be provided');
    }

    this.registrations.set(registration.name, registration);

    // Handle preload strategy
    if (registration.strategy === 'preload') {
      const shouldPreload = registration.preloadCondition?.() ?? true;
      if (shouldPreload) {
        // Start loading in background (don't await)
        this.loadPlugin(registration.name).catch(error => {
          console.warn(`Preload failed for ${registration.name}:`, error);
        });
      }
    }

    return Ok(undefined);
  }

  /**
   * Dynamic plugin loading with caching
   */
  async loadPlugin<T extends IAdvancedPlugin>(name: string): Promise<Result<T>> {
    // Return cached instance if available
    const cached = this.loadedPlugins.get(name);
    if (cached) {
      return Ok(cached as T);
    }

    // Return in-flight loading promise if exists
    const inFlight = this.loadingPromises.get(name);
    if (inFlight) {
      try {
        const plugin = await inFlight;
        return Ok(plugin as T);
      } catch (error) {
        return CommonErrors.INTERNAL(`Loading failed: ${error}`);
      }
    }

    // Start new loading process
    const registration = this.registrations.get(name);
    if (!registration) {
      return CommonErrors.INVALID_INPUT(`Plugin '${name}' not registered`);
    }

    const loadingPromise = this.createLoadingPromise<T>(registration);
    this.loadingPromises.set(name, loadingPromise);

    try {
      const startTime = Date.now();
      const plugin = await loadingPromise;
      
      // Initialize plugin
      const initResult = await plugin.initialize?.();
      if (initResult && !initResult.ok) {
        throw new Error(`Initialization failed: ${initResult.cause}`);
      }

      // Cache the loaded plugin
      this.loadedPlugins.set(name, plugin);
      
      // Record metrics
      this.metrics.set(name, {
        loadTime: Date.now() - startTime,
        errorCount: 0,
        lastActivity: new Date(),
        activeOperations: 0
      });

      return Ok(plugin as T);

    } catch (error) {
      this.loadingPromises.delete(name);
      return CommonErrors.INTERNAL(`Plugin loading failed: ${error}`);
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  private async createLoadingPromise<T extends IAdvancedPlugin>(
    registration: PluginRegistration<T>
  ): Promise<T> {
    if (registration.factory) {
      return await registration.factory();
    }

    if (registration.loader) {
      const module = await registration.loader();
      return new module.default();
    }

    throw new Error('No factory or loader provided');
  }

  /**
   * Get plugin with dynamic loading
   */
  async getPlugin<T extends IAdvancedPlugin>(name: string): Promise<Result<T>> {
    return await this.loadPlugin<T>(name);
  }

  /**
   * Preload specific plugins
   */
  async preloadPlugins(names: string[]): Promise<Result<void>> {
    const failures: string[] = [];
    
    await Promise.allSettled(
      names.map(async (name) => {
        const result = await this.loadPlugin(name);
        if (!result.ok) {
          failures.push(`${name}: ${result.cause}`);
        }
      })
    );

    if (failures.length > 0) {
      return CommonErrors.INTERNAL(`Preload failures: ${failures.join(', ')}`);
    }

    return Ok(undefined);
  }

  /**
   * Unload plugin and free memory
   */
  async unloadPlugin(name: string): Promise<Result<void>> {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) {
      return CommonErrors.INVALID_INPUT(`Plugin '${name}' not loaded`);
    }

    try {
      // Stop all operations
      plugin.stopAll('dispose');
      
      // Dispose plugin
      const disposeResult = await plugin.dispose?.();
      if (disposeResult && !disposeResult.ok) {
        console.warn(`Dispose warning for ${name}:`, disposeResult.cause);
      }

      // Remove from caches
      this.loadedPlugins.delete(name);
      this.metrics.delete(name);

      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Unload failed: ${error}`);
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): {
    registeredPlugins: number;
    loadedPlugins: number;
    totalMemoryUsage: number;
    averageLoadTime: number;
  } {
    const metricsArray = Array.from(this.metrics.values());
    
    return {
      registeredPlugins: this.registrations.size,
      loadedPlugins: this.loadedPlugins.size,
      totalMemoryUsage: metricsArray.reduce((sum, m) => sum + (m.memoryUsage || 0), 0),
      averageLoadTime: metricsArray.length > 0 
        ? metricsArray.reduce((sum, m) => sum + (m.loadTime || 0), 0) / metricsArray.length
        : 0
    };
  }

  /**
   * List all registered plugins
   */
  listRegistrations(): Array<{
    name: string;
    strategy: PluginLoadingStrategy;
    loaded: boolean;
    bundleChunk?: string;
  }> {
    return Array.from(this.registrations.entries()).map(([name, reg]) => ({
      name,
      strategy: reg.strategy,
      loaded: this.loadedPlugins.has(name),
      bundleChunk: reg.bundleChunk
    }));
  }

  /**
   * Clean up all plugins
   */
  async dispose(): Promise<Result<void>> {
    const names = Array.from(this.loadedPlugins.keys());
    const failures: string[] = [];

    await Promise.allSettled(
      names.map(async (name) => {
        const result = await this.unloadPlugin(name);
        if (!result.ok) {
          failures.push(`${name}: ${result.cause}`);
        }
      })
    );

    // Clear all maps
    this.registrations.clear();
    this.loadedPlugins.clear();
    this.loadingPromises.clear();
    this.metrics.clear();

    if (failures.length > 0) {
      return CommonErrors.INTERNAL(`Cleanup failures: ${failures.join(', ')}`);
    }

    return Ok(undefined);
  }
}

// ===== Global Registry Instance =====
export const dynamicPluginRegistry = new DynamicPluginRegistry();

// ===== Convenience Functions =====

/**
 * Register plugin with factory function
 */
export function registerPluginFactory<T extends IAdvancedPlugin>(
  name: string,
  factory: PluginFactory<T>,
  strategy: PluginLoadingStrategy = 'lazy',
  bundleChunk?: string
): Result<void> {
  return dynamicPluginRegistry.register({
    name,
    factory,
    strategy,
    bundleChunk
  });
}

/**
 * Register plugin with dynamic import loader
 */
export function registerPluginLoader<T extends IAdvancedPlugin>(
  name: string,
  loader: PluginLoader<T>,
  strategy: PluginLoadingStrategy = 'lazy',
  bundleChunk?: string,
  preloadCondition?: () => boolean
): Result<void> {
  return dynamicPluginRegistry.register({
    name,
    loader,
    strategy,
    bundleChunk,
    preloadCondition
  });
}

// ===== Usage Examples in Comments =====

/*
// Example 1: Static Registration
registerPluginFactory(
  'speech/simple',
  async () => new SimpleSpeechPlugin(),
  'static'
);

// Example 2: Dynamic Import with Code Splitting
registerPluginLoader(
  'speech/web', 
  async () => {
    const m = await import('./speech/WebSpeechPlugin');
    return m;
  },
  'lazy',
  'speech-web-chunk'
);

// Example 3: Preload with Condition
registerPluginLoader(
  'analytics/google',
  async () => import('./analytics/GoogleAnalyticsPlugin'),
  'preload',
  'analytics-chunk',
  () => import.meta.env.PROD && window.gtag !== undefined
);

// Example 4: Usage
const speechPlugin = await dynamicPluginRegistry.getPlugin<IAdvancedSpeechPlugin>('speech/web');
if (speechPlugin.ok) {
  await speechPlugin.data.speakText('Hello', { 
    priority: 5,
    timeout: 10000,
    onCancel: (reason) => console.log('Cancelled:', reason)
  });
}
*/