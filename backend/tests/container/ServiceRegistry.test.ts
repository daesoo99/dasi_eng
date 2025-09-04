/**
 * ServiceRegistry 테스트 - DI Container 핵심 기능 검증
 */

import { ServiceRegistry, ServiceDefinition } from '../../src/container/ServiceRegistry';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  describe('Service Registration and Resolution', () => {
    test('should register and resolve singleton service', async () => {
      class TestService {
        getValue() { return 'test-value'; }
      }

      registry.register('test-service', {
        factory: () => new TestService(),
        lifecycle: 'singleton'
      });

      const service1 = await registry.get<TestService>('test-service');
      const service2 = await registry.get<TestService>('test-service');

      expect(service1).toBe(service2); // Same instance
      expect(service1.getValue()).toBe('test-value');
    });

    test('should create new instances for transient services', async () => {
      class TestService {
        private id = Math.random();
        getId() { return this.id; }
      }

      registry.register('test-service', {
        factory: () => new TestService(),
        lifecycle: 'transient'
      });

      const service1 = await registry.get<TestService>('test-service');
      const service2 = await registry.get<TestService>('test-service');

      expect(service1).not.toBe(service2); // Different instances
      expect(service1.getId()).not.toBe(service2.getId());
    });

    test('should throw error for unknown service', async () => {
      await expect(registry.get('unknown-service'))
        .rejects
        .toThrow('Service not found: unknown-service');
    });
  });

  describe('Dependency Injection', () => {
    test('should resolve dependencies correctly', async () => {
      class Database {
        connect() { return 'connected'; }
      }

      class UserService {
        constructor(private db: Database) {}
        getUsers() { return this.db.connect(); }
      }

      // Register database
      registry.register('database', {
        factory: () => new Database(),
        lifecycle: 'singleton'
      });

      // Register user service with dependency
      registry.register('user-service', {
        factory: async (registry) => {
          const db = await registry!.get<Database>('database');
          return new UserService(db);
        },
        lifecycle: 'singleton',
        dependencies: ['database']
      });

      const userService = await registry.get<UserService>('user-service');
      expect(userService.getUsers()).toBe('connected');
    });

    test('should detect circular dependencies', async () => {
      registry.register('service-a', {
        factory: async (registry) => {
          await registry!.get('service-b');
          return {};
        },
        lifecycle: 'singleton',
        dependencies: ['service-b']
      });

      registry.register('service-b', {
        factory: async (registry) => {
          await registry!.get('service-a');
          return {};
        },
        lifecycle: 'singleton',
        dependencies: ['service-a']
      });

      await expect(registry.get('service-a'))
        .rejects
        .toThrow(/Circular dependency detected/);
    });
  });

  describe('Environment Configuration', () => {
    test('should apply environment-specific configuration', () => {
      registry.applyEnvironmentConfig('test');

      const serviceInfo = registry.getServiceInfo();
      
      // Test environment aliases should be registered
      expect(serviceInfo.services).toContain('content');
      expect(serviceInfo.services).toContain('cache');
      expect(serviceInfo.services).toContain('auth');
    });
  });

  describe('Health Check', () => {
    test('should return health status of all services', async () => {
      registry.register('healthy-service', {
        factory: () => ({ status: 'ok' }),
        lifecycle: 'singleton'
      });

      registry.register('failing-service', {
        factory: () => {
          throw new Error('Service failed');
        },
        lifecycle: 'singleton'
      });

      const health = await registry.healthCheck();

      expect(health['healthy-service']).toBe(true);
      expect(health['failing-service']).toBe(false);
    });
  });

  describe('Service Aliases', () => {
    test('should register and resolve aliases correctly', async () => {
      const testInstance = { value: 'original' };

      registry.register('original-service', {
        factory: () => testInstance,
        lifecycle: 'singleton'
      });

      registry.registerAlias('aliased-service', 'original-service');

      const original = await registry.get('original-service');
      const aliased = await registry.get('aliased-service');

      expect(original).toBe(aliased);
      expect(aliased.value).toBe('original');
    });
  });

  describe('Plugin System', () => {
    test('should register plugin with services', () => {
      const pluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        services: {
          'plugin-service': {
            factory: () => ({ plugin: true }),
            lifecycle: 'singleton' as const
          }
        }
      };

      registry.registerPlugin(pluginManifest);

      const serviceInfo = registry.getServiceInfo();
      expect(serviceInfo.plugins).toContain('test-plugin');
      expect(serviceInfo.services).toContain('test-plugin:plugin-service');
    });

    test('should validate plugin dependencies', () => {
      const pluginWithDeps = {
        name: 'dependent-plugin',
        version: '1.0.0',
        services: {},
        dependencies: ['non-existent-plugin']
      };

      expect(() => registry.registerPlugin(pluginWithDeps))
        .toThrow('Plugin dependency not found: non-existent-plugin required by dependent-plugin');
    });
  });

  describe('Shutdown', () => {
    test('should cleanup resources on shutdown', async () => {
      const mockDestroy = jest.fn();
      
      registry.register('destructible-service', {
        factory: () => ({
          destroy: mockDestroy
        }),
        lifecycle: 'singleton'
      });

      await registry.get('destructible-service');
      await registry.shutdown();

      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});