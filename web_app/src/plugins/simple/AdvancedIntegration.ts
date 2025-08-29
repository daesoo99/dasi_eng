/**
 * Advanced Plugin System Integration
 * @description Complete integration example with all advanced features
 */

import {
  dynamicPluginRegistry,
  registerPluginLoader,
  IAdvancedSpeechPlugin
} from './AdvancedPluginSystem';

import { bundlingManager } from './BundlingStrategy';
import { AdvancedSpeechPlugin } from './AdvancedSpeechPlugin';

// ===== Complete System Initialization =====

export async function initializeAdvancedPluginSystem(): Promise<{
  success: boolean;
  loadedPlugins: string[];
  bundleAnalysis: any;
  error?: string;
}> {
  try {
    console.log('🚀 Initializing Advanced Plugin System...');

    // Step 1: Initialize bundling strategy
    await bundlingManager.initializePluginLoading();

    // Step 2: Register plugins with dynamic loading
    await registerAdvancedPlugins();

    // Step 3: Preload critical plugins
    const preloadResult = await dynamicPluginRegistry.preloadPlugins([
      'speech/advanced'
    ]);

    if (!preloadResult.ok) {
      console.warn('Preload warning:', preloadResult.cause);
    }

    // Step 4: Get system metrics
    const systemMetrics = dynamicPluginRegistry.getSystemMetrics();
    const bundleAnalysis = bundlingManager.getBundleAnalysis();

    console.log('✅ Advanced Plugin System Ready!');
    console.log('📊 System Metrics:', systemMetrics);
    console.log('📦 Bundle Analysis:', bundleAnalysis);

    return {
      success: true,
      loadedPlugins: dynamicPluginRegistry.listRegistrations().map(r => r.name),
      bundleAnalysis
    };

  } catch (error) {
    console.error('❌ Advanced Plugin System initialization failed:', error);
    return {
      success: false,
      loadedPlugins: [],
      bundleAnalysis: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ===== Plugin Registration =====

async function registerAdvancedPlugins(): Promise<void> {
  // Advanced Speech Plugin with dynamic loading
  registerPluginLoader(
    'speech/advanced',
    async () => {
      // Track chunk loading
      bundlingManager.trackChunkLoaded('speech-advanced-chunk');
      
      // Dynamic import with chunk name
      const module = await import(
        /* webpackChunkName: "speech-advanced" */
        './AdvancedSpeechPlugin'
      );
      
      return { default: module.AdvancedSpeechPlugin };
    },
    'lazy',
    'speech-advanced-chunk',
    // Preload condition: load if device supports advanced speech features
    () => 'speechSynthesis' in window && 'webkitSpeechRecognition' in window
  );

  // Future plugin examples with different loading strategies
  registerFuturePlugins();
}

function registerFuturePlugins(): void {
  // Example: Analytics Plugin (lazy loaded)
  registerPluginLoader(
    'analytics/google',
    async () => {
      bundlingManager.trackChunkLoaded('analytics-chunk');
      
      // Simulate analytics plugin
      return {
        default: class GoogleAnalyticsPlugin {
          name = 'google-analytics';
          version = '1.0.0';
          
          async initialize() {
            console.log('📊 Google Analytics Plugin initialized');
            return { ok: true, data: undefined };
          }
          
          async dispose() {
            return { ok: true, data: undefined };
          }
          
          getMetrics() {
            return {
              errorCount: 0,
              lastActivity: new Date(),
              activeOperations: 0
            };
          }
          
          stopAll() {
            return { ok: true, data: undefined };
          }
          
          getQueueSize() { return 0; }
          clearQueue() { return { ok: true, data: undefined }; }
          getActiveOperations() { return []; }
        }
      };
    },
    'lazy',
    'analytics-chunk'
  );
}

// ===== Advanced Usage Hook =====

import { useState, useEffect, useCallback } from 'react';

export interface UseAdvancedSpeechResult {
  // State
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;
  queueSize: number;
  activeOperations: string[];
  
  // Enhanced Methods with Concurrency Control
  speakText: (
    text: string, 
    options?: {
      priority?: number;
      timeout?: number;
      onCancel?: (reason: string) => void;
      language?: string;
      rate?: number;
    }
  ) => Promise<{ success: boolean; queuePosition?: number }>;
  
  recognizeSpeech: (
    options?: {
      priority?: number;
      timeout?: number;
      onCancel?: (reason: string) => void;
      language?: string;
      maxDuration?: number;
    }
  ) => Promise<{ 
    success: boolean; 
    transcript?: string; 
    confidence?: number;
    queuePosition?: number;
  }>;
  
  playBeep: (
    frequency?: number,
    duration?: number,
    options?: {
      priority?: number;
      onCancel?: () => void;
    }
  ) => Promise<boolean>;
  
  // Control Methods
  stopAll: (reason?: 'user' | 'navigate' | 'error') => boolean;
  clearQueue: () => boolean;
  
  // Metrics
  getMetrics: () => any;
  getBundleAnalysis: () => any;
}

export function useAdvancedSpeech(): UseAdvancedSpeechResult {
  const [state, setState] = useState({
    isLoading: true,
    error: null as string | null,
    plugin: null as IAdvancedSpeechPlugin | null,
    queueSize: 0,
    activeOperations: [] as string[]
  });

  // Initialize plugin
  useEffect(() => {
    let mounted = true;
    
    const initPlugin = async () => {
      try {
        const result = await dynamicPluginRegistry.getPlugin<IAdvancedSpeechPlugin>('speech/advanced');
        
        if (!mounted) return;
        
        if (result.ok) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            plugin: result.data,
            error: null
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: result.cause || 'Failed to load speech plugin'
          }));
        }
      } catch (error) {
        if (!mounted) return;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    initPlugin();
    
    return () => { mounted = false; };
  }, []);

  // Update queue metrics periodically
  useEffect(() => {
    if (!state.plugin) return;
    
    const interval = setInterval(() => {
      if (state.plugin) {
        setState(prev => ({
          ...prev,
          queueSize: prev.plugin?.getQueueSize() || 0,
          activeOperations: prev.plugin?.getActiveOperations() || []
        }));
      }
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [state.plugin]);

  // Enhanced speech methods
  const speakText = useCallback(async (
    text: string, 
    options: {
      priority?: number;
      timeout?: number;
      onCancel?: (reason: string) => void;
      language?: string;
      rate?: number;
    } = {}
  ) => {
    if (!state.plugin) return { success: false };
    
    const controller = new AbortController();
    
    const result = await state.plugin.speakText(text, {
      priority: options.priority,
      timeout: options.timeout,
      onCancel: options.onCancel,
      language: options.language,
      rate: options.rate,
      signal: controller.signal
    });
    
    if (result.ok) {
      return {
        success: true,
        queuePosition: result.data.queuePosition
      };
    } else {
      setState(prev => ({ ...prev, error: result.cause || 'Speech failed' }));
      return { success: false };
    }
  }, [state.plugin]);

  const recognizeSpeech = useCallback(async (
    options: {
      priority?: number;
      timeout?: number;
      onCancel?: (reason: string) => void;
      language?: string;
      maxDuration?: number;
    } = {}
  ) => {
    if (!state.plugin) return { success: false };
    
    const controller = new AbortController();
    
    const result = await state.plugin.recognizeSpeech({
      priority: options.priority,
      timeout: options.timeout,
      onCancel: options.onCancel,
      language: options.language,
      maxDuration: options.maxDuration,
      signal: controller.signal
    });
    
    if (result.ok) {
      return {
        success: true,
        transcript: result.data.transcript,
        confidence: result.data.confidence,
        queuePosition: result.data.queuePosition
      };
    } else {
      setState(prev => ({ ...prev, error: result.cause || 'Recognition failed' }));
      return { success: false };
    }
  }, [state.plugin]);

  const playBeep = useCallback(async (
    frequency = 800,
    duration = 200,
    options: {
      priority?: number;
      onCancel?: () => void;
    } = {}
  ) => {
    if (!state.plugin) return false;
    
    const controller = new AbortController();
    
    const result = await state.plugin.playBeep(frequency, duration, {
      priority: options.priority,
      signal: controller.signal,
      onCancel: options.onCancel
    });
    
    if (!result.ok) {
      setState(prev => ({ ...prev, error: result.cause || 'Beep failed' }));
      return false;
    }
    
    return true;
  }, [state.plugin]);

  const stopAll = useCallback((reason: 'user' | 'navigate' | 'error' = 'user') => {
    if (!state.plugin) return false;
    
    const result = state.plugin.stopAll(reason);
    if (!result.ok) {
      setState(prev => ({ ...prev, error: result.cause || 'Stop failed' }));
      return false;
    }
    
    return true;
  }, [state.plugin]);

  const clearQueue = useCallback(() => {
    if (!state.plugin) return false;
    
    const result = state.plugin.clearQueue();
    if (!result.ok) {
      setState(prev => ({ ...prev, error: result.cause || 'Clear queue failed' }));
      return false;
    }
    
    return true;
  }, [state.plugin]);

  const getMetrics = useCallback(() => {
    return state.plugin?.getMetrics();
  }, [state.plugin]);

  const getBundleAnalysis = useCallback(() => {
    return bundlingManager.getBundleAnalysis();
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    isProcessing: state.activeOperations.length > 0,
    queueSize: state.queueSize,
    activeOperations: state.activeOperations,
    
    // Methods
    speakText,
    recognizeSpeech,
    playBeep,
    stopAll,
    clearQueue,
    getMetrics,
    getBundleAnalysis
  };
}

// ===== System Health & Monitoring =====

export function getAdvancedPluginSystemHealth(): {
  systemStatus: 'healthy' | 'degraded' | 'critical';
  pluginCount: number;
  memoryUsage: number;
  averageLoadTime: number;
  errorRate: number;
  recommendations: string[];
} {
  const metrics = dynamicPluginRegistry.getSystemMetrics();
  const bundleAnalysis = bundlingManager.getBundleAnalysis();
  
  let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  const recommendations: string[] = [];
  
  // Assess system health
  if (metrics.averageLoadTime > 1000) {
    systemStatus = 'degraded';
    recommendations.push('Plugin load times are high - consider code splitting');
  }
  
  if (metrics.totalMemoryUsage > 50 * 1024 * 1024) { // 50MB
    systemStatus = 'critical';
    recommendations.push('High memory usage - consider unloading unused plugins');
  }
  
  return {
    systemStatus,
    pluginCount: metrics.loadedPlugins,
    memoryUsage: metrics.totalMemoryUsage,
    averageLoadTime: metrics.averageLoadTime,
    errorRate: 0, // Would need to track errors over time
    recommendations: [...recommendations, ...bundleAnalysis.recommendations]
  };
}

// ===== Development Tools =====

if (import.meta.env.DEV) {
  // Export for dev console access
  (window as any).__advancedPluginSystem = {
    registry: dynamicPluginRegistry,
    bundling: bundlingManager,
    health: getAdvancedPluginSystemHealth,
    init: initializeAdvancedPluginSystem
  };
  
  console.log('🛠️ Advanced Plugin System dev tools available at window.__advancedPluginSystem');
}