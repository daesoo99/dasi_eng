/**
 * DASI Backend Server v2.0 - Modular Architecture
 * @description Port/Adapter 패턴 + DI Container + Plugin System
 */

import { startApplication } from './app/ApplicationBootstrap';
import { configManager } from './config/ConfigManager';

/**
 * 메인 서버 시작점
 */
async function main() {
  try {
    console.log('🎯 Starting DASI Backend v2.0...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Config: ${configManager.get('env')}`);
    
    // 애플리케이션 부트스트랩
    const context = await startApplication({
      environment: process.env.NODE_ENV,
      enablePlugins: [], // 현재는 플러그인 없음
      configOverrides: process.env.PORT ? {
        // 환경변수가 있을 때만 포트 오버라이드
        port: parseInt(process.env.PORT)
      } : {
        // 환경변수가 없으면 기본 설정 사용
      }
    });
    
    console.log('🎉 DASI Backend v2.0 started successfully!');
    console.log(`🌐 Server: http://localhost:${context.configManager.get('port')}`);
    console.log(`🩺 Health: http://localhost:${context.configManager.get('port')}/health`);
    console.log(`📊 System: http://localhost:${context.configManager.get('port')}/system/info`);
    
    // 개발 환경에서 유용한 디버그 정보
    if (context.configManager.isDevelopment()) {
      const serviceInfo = context.serviceRegistry.getServiceInfo();
      console.log('📦 Services loaded:', serviceInfo.services.join(', '));
      console.log('🔧 Adapters loaded:', Object.keys(context.adapterFactory.getAdapterStatus()).join(', '));
    }
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// 예외 처리
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 서버 시작
if (require.main === module) {
  main();
}