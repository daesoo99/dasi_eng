/**
 * Plugin Bundling Strategy Configuration
 * @description Defines how plugins are bundled and loaded
 */

import { 
  dynamicPluginRegistry, 
  registerPluginFactory, 
  registerPluginLoader 
} from './AdvancedPluginSystem';

// ===== Bundling Strategy Types =====

export type BundleStrategy = 'single' | 'chunk-per-plugin' | 'feature-chunks' | 'hybrid';

export interface BundleConfig {
  strategy: BundleStrategy;
  chunkSizeThreshold: number; // bytes
  preloadCriticalPlugins: string[];
  lazyLoadPlugins: string[];
  productionOptimizations: boolean;
}

// ===== Default Bundle Configuration =====

export const defaultBundleConfig: BundleConfig = {
  strategy: 'hybrid',
  chunkSizeThreshold: 50 * 1024, // 50KB
  preloadCriticalPlugins: ['speech/simple'],
  lazyLoadPlugins: ['analytics', 'payment', 'storage'],
  productionOptimizations: import.meta.env.PROD
};

// ===== Bundle Strategy Implementation =====

export class PluginBundlingManager {
  private config: BundleConfig;
  private loadedChunks = new Set<string>();

  constructor(config: BundleConfig = defaultBundleConfig) {
    this.config = config;
  }

  /**
   * Initialize plugin loading strategy based on bundle config
   */
  async initializePluginLoading(): Promise<void> {
    console.log(`🎯 Initializing Plugin Bundling Strategy: ${this.config.strategy}`);

    switch (this.config.strategy) {
      case 'single':
        await this.initializeSingleBundle();
        break;
      case 'chunk-per-plugin':
        await this.initializeChunkPerPlugin();
        break;
      case 'feature-chunks':
        await this.initializeFeatureChunks();
        break;
      case 'hybrid':
        await this.initializeHybridStrategy();
        break;
    }

    // Preload critical plugins
    if (this.config.preloadCriticalPlugins.length > 0) {
      console.log('🚀 Preloading critical plugins:', this.config.preloadCriticalPlugins);
      await dynamicPluginRegistry.preloadPlugins(this.config.preloadCriticalPlugins);
    }
  }

  // ===== Strategy 1: Single Bundle =====
  private async initializeSingleBundle(): Promise<void> {
    // All plugins in main bundle - no dynamic imports
    console.log('📦 Single Bundle Strategy: All plugins in main bundle');
    
    // Import all plugins statically
    const { SimpleSpeechPlugin } = await import('./SimpleSpeechPlugin');
    const { AdvancedSpeechPlugin } = await import('./AdvancedSpeechPlugin');
    
    // Register with static factories
    registerPluginFactory(
      'speech/simple',
      async () => new SimpleSpeechPlugin(),
      'static'
    );
    
    registerPluginFactory(
      'speech/advanced',
      async () => new AdvancedSpeechPlugin(),
      'static'
    );
  }

  // ===== Strategy 2: Chunk Per Plugin =====
  private async initializeChunkPerPlugin(): Promise<void> {
    console.log('🧩 Chunk Per Plugin Strategy: Each plugin in separate chunk');

    // Each plugin gets its own chunk
    registerPluginLoader(
      'speech/simple',
      () => import(
        /* webpackChunkName: "plugin-speech-simple" */
        './SimpleSpeechPlugin'
      ).then(m => ({ default: m.SimpleSpeechPlugin })),
      'lazy',
      'plugin-speech-simple'
    );

    registerPluginLoader(
      'speech/advanced',
      () => import(
        /* webpackChunkName: "plugin-speech-advanced" */
        './AdvancedSpeechPlugin'
      ).then(m => ({ default: m.AdvancedSpeechPlugin })),
      'lazy',
      'plugin-speech-advanced'
    );

    // Example: Future plugins
    this.registerFuturePluginChunks();
  }

  // ===== Strategy 3: Feature-Based Chunks =====
  private async initializeFeatureChunks(): Promise<void> {
    console.log('🎨 Feature Chunks Strategy: Group plugins by feature');

    // Speech feature chunk (multiple speech plugins)
    registerPluginLoader(
      'speech/simple',
      () => import(
        /* webpackChunkName: "feature-speech" */
        './speech/SpeechFeatureChunk'
      ).then(m => ({ default: m.SimpleSpeechPlugin })),
      'lazy',
      'feature-speech'
    );

    registerPluginLoader(
      'speech/advanced',
      () => import(
        /* webpackChunkName: "feature-speech" */
        './speech/SpeechFeatureChunk'
      ).then(m => ({ default: m.AdvancedSpeechPlugin })),
      'lazy',
      'feature-speech'
    );

    // Analytics feature chunk (when we have multiple analytics plugins)
    this.registerAnalyticsFeatureChunk();
    
    // Payment feature chunk (when we have multiple payment plugins)
    this.registerPaymentFeatureChunk();
  }

  // ===== Strategy 4: Hybrid Strategy (Recommended) =====
  private async initializeHybridStrategy(): Promise<void> {
    console.log('🎯 Hybrid Strategy: Critical in main, others lazy-loaded');

    // Critical plugins: Static loading (in main bundle)
    registerPluginFactory(
      'speech/simple',
      async () => {
        const { SimpleSpeechPlugin } = await import('./SimpleSpeechPlugin');
        return new SimpleSpeechPlugin();
      },
      'preload' // Load early but async
    );

    // Advanced plugins: Lazy loading with feature chunks
    registerPluginLoader(
      'speech/advanced',
      () => import(
        /* webpackChunkName: "feature-speech-advanced" */
        './AdvancedSpeechPlugin'
      ).then(m => ({ default: m.AdvancedSpeechPlugin })),
      'lazy',
      'feature-speech-advanced',
      () => this.shouldLoadAdvancedSpeech() // Conditional preload
    );

    // Non-critical plugins: Lazy loading
    this.registerLazyPlugins();
  }

  // ===== Helper Methods =====

  private registerFuturePluginChunks(): void {
    // Example future plugin registrations
    
    // Analytics plugins
    registerPluginLoader(
      'analytics/google',
      () => import(
        /* webpackChunkName: "plugin-analytics-google" */
        './analytics/GoogleAnalyticsPlugin'
      ).then(m => ({ default: m.GoogleAnalyticsPlugin })),
      'lazy',
      'plugin-analytics-google'
    );

    // Payment plugins  
    registerPluginLoader(
      'payment/stripe',
      () => import(
        /* webpackChunkName: "plugin-payment-stripe" */
        './payment/StripePaymentPlugin'
      ).then(m => ({ default: m.StripePaymentPlugin })),
      'lazy',
      'plugin-payment-stripe'
    );

    registerPluginLoader(
      'payment/kakao',
      () => import(
        /* webpackChunkName: "plugin-payment-kakao" */
        './payment/KakaoPaymentPlugin'
      ).then(m => ({ default: m.KakaoPaymentPlugin })),
      'lazy',
      'plugin-payment-kakao'
    );
  }

  private registerAnalyticsFeatureChunk(): void {
    // Multiple analytics plugins in one chunk
    const analyticsChunkLoader = () => import(
      /* webpackChunkName: "feature-analytics" */
      './features/AnalyticsFeatureChunk'
    );

    registerPluginLoader(
      'analytics/google',
      () => analyticsChunkLoader().then(m => ({ default: m.GoogleAnalyticsPlugin })),
      'lazy',
      'feature-analytics'
    );

    registerPluginLoader(
      'analytics/mixpanel',
      () => analyticsChunkLoader().then(m => ({ default: m.MixpanelPlugin })),
      'lazy',
      'feature-analytics'
    );
  }

  private registerPaymentFeatureChunk(): void {
    // Multiple payment plugins in one chunk
    const paymentChunkLoader = () => import(
      /* webpackChunkName: "feature-payment" */
      './features/PaymentFeatureChunk'
    );

    registerPluginLoader(
      'payment/stripe',
      () => paymentChunkLoader().then(m => ({ default: m.StripePlugin })),
      'lazy',
      'feature-payment'
    );

    registerPluginLoader(
      'payment/kakao',
      () => paymentChunkLoader().then(m => ({ default: m.KakaoPayPlugin })),
      'lazy',
      'feature-payment'
    );
  }

  private registerLazyPlugins(): void {
    // Plugins that are definitely lazy-loaded
    this.config.lazyLoadPlugins.forEach(pluginName => {
      if (pluginName.startsWith('analytics/')) {
        this.registerAnalyticsFeatureChunk();
      } else if (pluginName.startsWith('payment/')) {
        this.registerPaymentFeatureChunk();
      }
    });
  }

  private shouldLoadAdvancedSpeech(): boolean {
    // Conditional logic for preloading advanced speech plugin
    return (
      // Load if user has premium subscription
      (window as any).userPremium === true ||
      // Load if device has good speech support
      'speechSynthesis' in window && 'webkitSpeechRecognition' in window ||
      // Load if in production and user is active
      (import.meta.env.PROD && document.hasFocus())
    );
  }

  /**
   * Get bundle analysis
   */
  getBundleAnalysis(): {
    strategy: BundleStrategy;
    loadedChunks: string[];
    estimatedSavings: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (this.config.strategy === 'single' && this.loadedChunks.size === 0) {
      recommendations.push('Consider switching to hybrid strategy for better performance');
    }

    if (this.loadedChunks.size > 10) {
      recommendations.push('Too many chunks loaded - consider feature-based chunking');
    }

    return {
      strategy: this.config.strategy,
      loadedChunks: Array.from(this.loadedChunks),
      estimatedSavings: this.calculateEstimatedSavings(),
      recommendations
    };
  }

  private calculateEstimatedSavings(): string {
    const baselineSize = 500; // KB - estimated size if all plugins in main bundle
    const currentSize = this.estimateCurrentBundleSize();
    const savings = Math.max(0, baselineSize - currentSize);
    
    return `${savings}KB (${Math.round(savings/baselineSize * 100)}%)`;
  }

  private estimateCurrentBundleSize(): number {
    // Rough estimation based on loaded chunks
    const chunkSizes = {
      'main': 200,
      'feature-speech': 80,
      'feature-analytics': 60,
      'feature-payment': 100,
      'plugin-speech-simple': 40,
      'plugin-speech-advanced': 60
    };

    let totalSize = chunkSizes.main; // Base size
    this.loadedChunks.forEach(chunk => {
      totalSize += chunkSizes[chunk as keyof typeof chunkSizes] || 50;
    });

    return totalSize;
  }

  /**
   * Track chunk loading for analysis
   */
  trackChunkLoaded(chunkName: string): void {
    this.loadedChunks.add(chunkName);
    console.log(`📦 Chunk loaded: ${chunkName} (${this.loadedChunks.size} total)`);
  }
}

// ===== Global Instance =====
export const bundlingManager = new PluginBundlingManager(defaultBundleConfig);

// ===== Development Helpers =====

if (import.meta.env.DEV) {
  // Make bundling manager available in dev console
  (window as any).__pluginBundling = bundlingManager;
  
  // Log bundle strategy on load
  console.log('🎯 Plugin Bundling Strategy:', defaultBundleConfig.strategy);
  console.log('📊 Bundle Config:', defaultBundleConfig);
}

// ===== Usage Examples =====

/*
// Example 1: Initialize with default hybrid strategy
await bundlingManager.initializePluginLoading();

// Example 2: Custom bundle configuration
const customBundling = new PluginBundlingManager({
  strategy: 'chunk-per-plugin',
  chunkSizeThreshold: 100 * 1024, // 100KB
  preloadCriticalPlugins: ['speech/advanced'],
  lazyLoadPlugins: ['payment/stripe', 'analytics/google'],
  productionOptimizations: true
});

// Example 3: Get bundle analysis
const analysis = bundlingManager.getBundleAnalysis();
console.log('Bundle Analysis:', analysis);

// Example 4: Load plugin with chunk tracking
const plugin = await dynamicPluginRegistry.getPlugin('speech/advanced');
bundlingManager.trackChunkLoaded('feature-speech-advanced');
*/