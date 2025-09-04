/**
 * Jest 테스트 설정
 */

import 'dotenv/config';

// Firebase Admin SDK 초기화 (에뮬레이터용)
import admin from 'firebase-admin';

// Firebase 앱이 이미 초기화되었는지 확인
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-test',
    // 에뮬레이터 환경에서는 실제 credentials 불필요
  });
}

// 전역 테스트 타임아웃
jest.setTimeout(30000);

// 콘솔 출력 최소화 (에러만 출력)
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(), // 일반 로그 숨김
  warn: originalConsole.warn,
  error: originalConsole.error,
  info: jest.fn(), // info 로그도 숨김
  debug: jest.fn() // debug 로그도 숨김
};

// 각 테스트 후 정리
afterEach(() => {
  jest.clearAllMocks();
});

// 전체 테스트 완료 후 Firebase 앱 정리
afterAll(async () => {
  await Promise.all(admin.apps.map(app => app?.delete()));
});