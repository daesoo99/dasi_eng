/**
 * 플러그인 시스템 진입점
 * @description 모든 플러그인 관련 기능의 중앙 진입점
 */

// Core exports
export type { 
  IPlugin, 
  PluginMetadata, 
  PluginConfig as BasePluginConfig,
  PluginStatus,
  PluginEvent,
  PluginEventHandler,
  IPluginFactory 
} from './core/IPlugin';

export { BasePlugin } from './core/BasePlugin';
export { pluginRegistry } from './core/PluginRegistry';
export { pluginLifecycle } from './core/PluginLifecycleManager';

// Config exports
export type { 
  PluginConfigEntry, 
  GlobalPluginConfig 
} from './config/PluginConfig';
export { pluginConfig } from './config/PluginConfig';

// Speech plugin exports
export type { 
  ISpeechPlugin, 
  SpeechPluginConfig,
  SpeechProcessingState,
  SpeechPluginEvent,
  SpeechEventHandler,
  ISpeechPluginFactory 
} from './speech/ISpeechPlugin';

export { WebSpeechPlugin } from './speech/WebSpeechPlugin';
export { WebSpeechPluginFactory } from './speech/WebSpeechPluginFactory';

// Main manager exports
export type { 
  PluginManagerOptions, 
  PluginInfo 
} from './PluginManager';

export {
  PluginManager,
  pluginManager,
  getSpeechPlugin,
  getPlugin,
  isPluginAvailable
} from './PluginManager';

// Import pluginManager for utility functions
import { pluginManager } from './PluginManager';

// Utility functions for easy initialization
export const initializePlugins = async (options?: PluginManagerOptions) => {
  return pluginManager.initialize(options);
};

export const shutdownPlugins = async () => {
  return pluginManager.dispose();
};

// Plugin system health check
export const checkPluginSystemHealth = () => {
  const metrics = pluginManager.getSystemMetrics();
  const activePlugins = pluginManager.getActivePlugins();
  
  return {
    isHealthy: metrics.errorCount === 0 && activePlugins.length > 0,
    metrics,
    activePlugins: activePlugins.length,
    totalPlugins: metrics.totalPlugins
  };
};