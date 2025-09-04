/**
 * ConfigManager 테스트 - 환경별 설정 관리 검증
 */

import { ConfigManager } from '../../src/config/ConfigManager';

describe('ConfigManager', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Environment Configuration Loading', () => {
    test('should load development configuration', () => {
      process.env.PORT = '8080'; // Valid port for development
      const config = new ConfigManager('development');

      expect(config.get('env')).toBe('development');
      expect(config.get('database').host).toBe('localhost');
      expect(config.get('cache').type).toBe('memory');
      expect(config.get('auth').provider).toBe('firebase');
      expect(config.get('features').aiScoring).toBe(false);
    });

    test('should load production configuration', () => {
      process.env.DB_HOST = 'prod-db.example.com';
      process.env.DB_NAME = 'dasi_production';
      process.env.REDIS_HOST = 'prod-redis.example.com';
      
      const config = new ConfigManager('production');

      expect(config.get('env')).toBe('production');
      expect(config.get('database').host).toBe('prod-db.example.com');
      expect(config.get('database').database).toBe('dasi_production');
      expect(config.get('database').ssl).toBe(true);
      expect(config.get('cache').type).toBe('redis');
      expect(config.get('cache').redis?.host).toBe('prod-redis.example.com');
      expect(config.get('features').aiScoring).toBe(true);
    });

    test('should load test configuration', () => {
      const config = new ConfigManager('test');

      expect(config.get('env')).toBe('test');
      expect(config.get('port')).toBe(0); // Random port for tests
      expect(config.get('cache').type).toBe('memory');
      expect(config.get('auth').provider).toBe('mock');
      expect(config.get('features').aiScoring).toBe(false);
      expect(config.get('limits').maxRequestsPerMinute).toBe(10000); // High limit for tests
    });

    test('should use NODE_ENV as default environment', () => {
      process.env.NODE_ENV = 'test';
      const config = new ConfigManager();

      expect(config.get('env')).toBe('test');
    });

    test('should fallback to development if no environment specified', () => {
      delete process.env.NODE_ENV;
      const config = new ConfigManager();

      expect(config.get('env')).toBe('development');
    });
  });

  describe('Environment Variables Integration', () => {
    test('should use environment variables for configuration', () => {
      process.env.PORT = '9000';
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';
      process.env.FIREBASE_PROJECT_ID = 'test-project-id';

      const config = new ConfigManager('development');

      expect(config.get('port')).toBe(9000);
      expect(config.get('cors').origins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
      expect(config.get('auth').firebase?.projectId).toBe('test-project-id');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate port range', () => {
      process.env.PORT = '70000'; // Invalid port
      
      expect(() => new ConfigManager('development'))
        .toThrow('Configuration validation failed');
    });

    test('should validate Firebase configuration in production', () => {
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      expect(() => new ConfigManager('production'))
        .toThrow(/Firebase project ID is required for production/);
    });

    test('should validate Redis configuration when using Redis cache', () => {
      delete process.env.REDIS_HOST;

      expect(() => new ConfigManager('production'))
        .toThrow(/Redis host is required when using Redis cache/);
    });

    test('should allow port 0 for test environment', () => {
      const config = new ConfigManager('test');
      expect(config.get('port')).toBe(0); // Should not throw
    });
  });

  describe('Configuration Overrides', () => {
    test('should allow runtime configuration override', () => {
      const config = new ConfigManager('test');
      
      expect(config.get('port')).toBe(0);
      
      config.override('port', 8080);
      expect(config.get('port')).toBe(8080);
    });

    test('should return overridden values in getAll()', () => {
      const config = new ConfigManager('test');
      
      config.override('port', 8080);
      config.override('features', { aiScoring: true, advancedAnalytics: true, realTimeSync: false });
      
      const allConfig = config.getAll();
      expect(allConfig.port).toBe(8080);
      expect(allConfig.features.aiScoring).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    test('should check feature flags correctly', () => {
      const devConfig = new ConfigManager('development');
      const prodConfig = new ConfigManager('production');

      expect(devConfig.isFeatureEnabled('aiScoring')).toBe(false);
      expect(prodConfig.isFeatureEnabled('aiScoring')).toBe(true);

      expect(devConfig.isFeatureEnabled('advancedAnalytics')).toBe(false);
      expect(prodConfig.isFeatureEnabled('advancedAnalytics')).toBe(true);
    });
  });

  describe('Environment Helpers', () => {
    test('should provide correct environment checks', () => {
      process.env.PORT = '8080'; // Valid port
      process.env.FIREBASE_PROJECT_ID = 'test-project'; // Valid firebase config
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = '/path/to/key.json'; // Valid path
      
      const devConfig = new ConfigManager('development');
      const prodConfig = new ConfigManager('production');
      const testConfig = new ConfigManager('test');

      expect(devConfig.isDevelopment()).toBe(true);
      expect(devConfig.isProduction()).toBe(false);
      expect(devConfig.isTest()).toBe(false);

      expect(prodConfig.isDevelopment()).toBe(false);
      expect(prodConfig.isProduction()).toBe(true);
      expect(prodConfig.isTest()).toBe(false);

      expect(testConfig.isDevelopment()).toBe(false);
      expect(testConfig.isProduction()).toBe(false);
      expect(testConfig.isTest()).toBe(true);
    });
  });

  describe('Safe String Output', () => {
    test('should mask sensitive information in string output', () => {
      process.env.PORT = '8080';
      process.env.FIREBASE_PROJECT_ID = 'test-project'; 
      process.env.REDIS_HOST = 'redis-host';
      process.env.DB_PASSWORD = 'secret-password';
      process.env.REDIS_PASSWORD = 'secret-redis';
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = '/path/to/secret.json';

      const config = new ConfigManager('production');
      const safeString = config.toSafeString();
      const parsed = JSON.parse(safeString);

      // Check that sensitive data is masked
      if (parsed.database?.password) {
        expect(parsed.database.password).toBe('***');
      }
      if (parsed.cache?.redis?.password) {
        expect(parsed.cache.redis.password).toBe('***');
      }
      if (parsed.auth?.firebase?.serviceAccountPath) {
        expect(parsed.auth.firebase.serviceAccountPath).toMatch(/^\*+$/);
      }
    });
  });

  describe('Configuration Reloading', () => {
    test('should allow reloading in development only', () => {
      process.env.PORT = '8080';
      const devConfig = new ConfigManager('development');
      
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.REDIS_HOST = 'redis-host';
      const prodConfig = new ConfigManager('production');

      expect(() => devConfig.reload()).not.toThrow();
      expect(() => prodConfig.reload()).toThrow('Config reload is only allowed in development');
    });

    test('should reset overrides on reload', () => {
      process.env.PORT = '8080';
      const config = new ConfigManager('development');
      
      config.override('port', 9999);
      expect(config.get('port')).toBe(9999);
      
      config.reload();
      expect(config.get('port')).not.toBe(9999);
    });
  });

  describe('Configuration Watching', () => {
    test('should provide watch functionality in development', () => {
      process.env.PORT = '8080';
      const devConfig = new ConfigManager('development');
      
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.REDIS_HOST = 'redis-host';
      const prodConfig = new ConfigManager('production');

      const mockCallback = jest.fn();
      
      const devUnwatch = devConfig.watch(mockCallback);
      const prodUnwatch = prodConfig.watch(mockCallback);

      expect(typeof devUnwatch).toBe('function');
      expect(typeof prodUnwatch).toBe('function');

      // Cleanup
      devUnwatch();
      prodUnwatch();
    });
  });
});