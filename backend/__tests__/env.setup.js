/**
 * Jest 환경 설정 - Firebase 에뮬레이터 환경 변수
 */

process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';  
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Firebase 프로젝트 ID (테스트용)
process.env.FIREBASE_PROJECT_ID = 'demo-test';

// 로깅 레벨 (테스트 시 노이즈 줄이기)
process.env.LOG_LEVEL = 'error';