/**
 * Jest 설정 파일
 * 목적: 단위 테스트 및 통합 테스트를 위한 Jest 환경 구성
 */

module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',

  // 모듈 경로 매핑 (TypeScript path mapping과 일치)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 테스트 파일 패턴
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // 변환 설정
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },

  // 파일 확장자 해석
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // 테스트 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/__tests__/**/*',
  ],

  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // 핵심 모듈은 더 높은 커버리지 요구
    './src/state/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/hooks/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // 테스트 환경 설정
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // 정적 자산 모킹
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },

  // 무시할 경로
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],

  // 변환 무시 패턴
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library|@babel|babel-preset))',
  ],

  // 글로벌 설정
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // 테스트 타임아웃 (비동기 테스트를 위해)
  testTimeout: 10000,

  // 상세한 출력
  verbose: true,

  // 워치 모드에서 무시할 파일들
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],

  // 테스트 실행 전후 스크립트
  globalSetup: undefined,
  globalTeardown: undefined,

  // 병렬 실행 설정
  maxWorkers: '50%',

  // 에러 리포팅
  errorOnDeprecated: true,

  // 캐시 디렉토리
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
};