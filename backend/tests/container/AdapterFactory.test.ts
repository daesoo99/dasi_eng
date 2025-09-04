/**
 * AdapterFactory 테스트 - 어댑터 자동 발견과 환경 설정 검증
 */

import { AdapterFactory } from '../../src/container/AdapterFactory';
import { ServiceRegistry } from '../../src/container/ServiceRegistry';

describe('AdapterFactory', () => {
  let serviceRegistry: ServiceRegistry;
  let adapterFactory: AdapterFactory;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistry();
    adapterFactory = new AdapterFactory(serviceRegistry, 'test');
  });

  afterEach(async () => {
    await serviceRegistry.shutdown();
  });

  describe('Environment-based Adapter Selection', () => {
    test('should select correct adapters for test environment', async () => {
      await adapterFactory.autoDiscoverAdapters();
      
      const status = adapterFactory.getAdapterStatus();
      
      // Test environment should use specific adapters
      expect(status['content-fs']).toBeDefined();
      expect(status['content-fs'].name).toBe('fs-content-adapter');
      expect(status['content-fs'].environment).toContain('test');
      
      expect(status['cache-memory']).toBeDefined();
      expect(status['cache-memory'].name).toBe('memory-cache-adapter');
      expect(status['cache-memory'].environment).toContain('test');
    });

    test('should skip adapters not suitable for environment', async () => {
      const prodFactory = new AdapterFactory(serviceRegistry, 'production');
      await prodFactory.autoDiscoverAdapters();
      
      const status = prodFactory.getAdapterStatus();
      
      // Production-only adapters should be registered
      expect(status['content-firebase']).toBeDefined();
      expect(status['cache-redis']).toBeDefined();
    });

    test('should register environment-specific aliases', async () => {
      await adapterFactory.autoDiscoverAdapters();
      
      const serviceInfo = serviceRegistry.getServiceInfo();
      
      // Test environment aliases
      expect(serviceInfo.services).toContain('content');
      expect(serviceInfo.services).toContain('cache');
      expect(serviceInfo.services).toContain('auth');
    });
  });

  describe('Adapter Registration', () => {
    test('should register adapter module correctly', () => {
      const mockAdapter = {
        config: {
          name: 'mock-adapter',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({ mock: true })
      };

      adapterFactory.registerAdapter('mock-port', mockAdapter);
      
      const status = adapterFactory.getAdapterStatus();
      expect(status['mock-port']).toBeDefined();
      expect(status['mock-port'].name).toBe('mock-adapter');
    });

    test('should register adapter in service registry', () => {
      const mockAdapter = {
        config: {
          name: 'mock-adapter',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({ mock: true })
      };

      adapterFactory.registerAdapter('mock-port', mockAdapter);
      
      const serviceInfo = serviceRegistry.getServiceInfo();
      expect(serviceInfo.services).toContain('mock-port');
    });

    test('should skip adapter for wrong environment', () => {
      const mockAdapter = {
        config: {
          name: 'prod-only-adapter',
          version: '1.0.0',
          environment: ['production']
        },
        factory: () => ({ production: true })
      };

      adapterFactory.registerAdapter('prod-port', mockAdapter);
      
      const status = adapterFactory.getAdapterStatus();
      expect(status['prod-port']).toBeUndefined();
    });
  });

  describe('Adapter Health Check', () => {
    test('should check health of registered adapters', async () => {
      const healthyAdapter = {
        config: {
          name: 'healthy-adapter',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({
          healthCheck: jest.fn().mockResolvedValue(true)
        })
      };

      const failingAdapter = {
        config: {
          name: 'failing-adapter',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({
          healthCheck: jest.fn().mockRejectedValue(new Error('Adapter failed'))
        })
      };

      adapterFactory.registerAdapter('healthy-port', healthyAdapter);
      adapterFactory.registerAdapter('failing-port', failingAdapter);

      const health = await adapterFactory.healthCheck();

      expect(health['healthy-port']).toBe(true);
      expect(health['failing-port']).toBe(false);
    });

    test('should handle adapters without healthCheck method', async () => {
      const simpleAdapter = {
        config: {
          name: 'simple-adapter',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({ simple: true })
      };

      adapterFactory.registerAdapter('simple-port', simpleAdapter);

      const health = await adapterFactory.healthCheck();
      expect(health['simple-port']).toBe(true); // Should pass if no healthCheck method
    });
  });

  describe('Adapter Switching', () => {
    test('should allow runtime adapter switching', async () => {
      const adapter1 = {
        config: {
          name: 'adapter-1',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({ version: 1 })
      };

      const adapter2 = {
        config: {
          name: 'adapter-2',
          version: '1.0.0',
          environment: ['test']
        },
        factory: () => ({ version: 2 })
      };

      adapterFactory.registerAdapter('adapter-1', adapter1);
      adapterFactory.registerAdapter('adapter-2', adapter2);

      // Switch the alias to point to adapter-2
      adapterFactory.switchAdapter('my-port', 'adapter-2');

      const resolved = await serviceRegistry.get('my-port');
      expect(resolved.version).toBe(2);
    });
  });

  describe('Plugin Adapter Loading', () => {
    test('should load adapter from plugin manifest', async () => {
      const pluginManifest = {
        name: 'test-adapter-plugin',
        version: '1.0.0',
        provides: ['custom-port'],
        services: {
          'custom-port': {
            factory: () => ({ plugin: 'adapter' }),
            lifecycle: 'singleton' as const
          }
        }
      };

      await adapterFactory.loadAdapterPlugin(pluginManifest);

      const serviceInfo = serviceRegistry.getServiceInfo();
      expect(serviceInfo.plugins).toContain('test-adapter-plugin');
      expect(serviceInfo.services).toContain('custom-port');

      const adapter = await serviceRegistry.get('custom-port');
      expect(adapter.plugin).toBe('adapter');
    });
  });
});