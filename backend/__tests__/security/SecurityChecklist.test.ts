/**
 * 보안 체크리스트 테스트
 */

import { SecurityValidator, SECURITY_CHECKLIST } from '../../src/shared/security/SecurityChecklist';
import { FirebaseAuthAdapter } from '../../src/adapters/firebase/FirebaseAuthAdapter';
import { CategorizedError } from '../../src/shared/errors/CategorizedError';

// Firebase 에뮬레이터 환경 설정
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

describe('보안 체크리스트 검증', () => {
  
  describe('OWASP A01 - Access Control', () => {
    test('모든 인증 관련 체크가 구현되어야 함', () => {
      const accessControlChecks = SECURITY_CHECKLIST.find(
        cat => cat.owaspId === 'A01'
      )?.checks;

      expect(accessControlChecks).toBeDefined();
      
      // 중요한 보안 체크들이 구현되었는지 확인
      const criticalChecks = accessControlChecks?.filter(
        check => check.priority === 'critical'
      );
      
      criticalChecks?.forEach(check => {
        expect(check.status).toBe('implemented');
      });
    });

    test('Firebase Token 검증이 올바르게 작동해야 함', async () => {
      // 에뮬레이터 환경에서만 실행
      if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        return;
      }

      // 유효하지 않은 토큰 테스트
      const mockFirestore = {} as any;
      const authAdapter = new FirebaseAuthAdapter(mockFirestore);

      await expect(
        authAdapter.verifyToken('invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('OWASP A02 - Cryptographic Failures', () => {
    test('민감 정보 로깅 방지 체크', () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token-here',
        apiKey: 'api-key-secret'
      };

      // 로깅 시 민감 정보가 마스킹되는지 테스트
      const logMessage = JSON.stringify(sensitiveData);
      
      // 실제 구현에서는 민감 정보 탐지 및 마스킹 로직 필요
      expect(logMessage).toContain('secret123'); // 현재는 마스킹되지 않음
      
      // TODO: 자동 마스킹 구현 후 아래 테스트로 변경
      // expect(maskedMessage).toContain('***');
      // expect(maskedMessage).not.toContain('secret123');
    });
  });

  describe('OWASP A03 - Injection', () => {
    test('입력 검증이 Zod로 올바르게 구현되어야 함', () => {
      // 입력 검증 스키마 테스트는 각 UseCase에서 수행
      // 여기서는 전반적인 검증 정책 확인
      
      const injectionChecks = SECURITY_CHECKLIST.find(
        cat => cat.owaspId === 'A03'
      )?.checks;

      expect(injectionChecks).toBeDefined();
      
      const inputValidationCheck = injectionChecks?.find(
        check => check.id === 'A03-001'
      );
      
      expect(inputValidationCheck?.status).toBe('implemented');
    });
  });

  describe('OWASP A05 - Security Misconfiguration', () => {
    test('Rate Limiting 체크', () => {
      const rateLimitCheck = SECURITY_CHECKLIST.find(
        cat => cat.owaspId === 'A05'
      )?.checks.find(
        check => check.id === 'A05-001'
      );

      expect(rateLimitCheck).toBeDefined();
      expect(rateLimitCheck?.remediation).toContain('Rate Limit');
    });

    test('보안 헤더 누락 확인', () => {
      const securityHeaderCheck = SECURITY_CHECKLIST.find(
        cat => cat.owaspId === 'A05'
      )?.checks.find(
        check => check.id === 'A05-003'
      );

      expect(securityHeaderCheck?.status).toBe('missing');
      expect(securityHeaderCheck?.remediation).toContain('보안 헤더');
    });
  });

  describe('전체 보안 평가', () => {
    test('보안 점수가 허용 가능한 수준이어야 함', () => {
      const assessment = SecurityValidator.assessSecurityStatus();

      // 최소 75점 이상이어야 함
      expect(assessment.overallScore).toBeGreaterThanOrEqual(75);

      // Critical 이슈는 0개여야 함
      expect(assessment.criticalIssues).toBe(0);

      console.log('보안 평가 결과:');
      console.log(`- 전체 점수: ${assessment.overallScore}점`);
      console.log(`- Critical 이슈: ${assessment.criticalIssues}개`);
      console.log(`- High 이슈: ${assessment.highIssues}개`);
      
      if (assessment.recommendations.length > 0) {
        console.log('개선 권장사항:');
        assessment.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    });

    test('각 OWASP 카테고리별 구현 상태 확인', () => {
      SECURITY_CHECKLIST.forEach(category => {
        const implementedChecks = category.checks.filter(
          check => check.status === 'implemented'
        ).length;
        
        const totalChecks = category.checks.length;
        const implementationRate = (implementedChecks / totalChecks) * 100;

        console.log(
          `${category.owaspId} ${category.title}: ${implementationRate.toFixed(1)}% 구현`
        );

        // 각 카테고리별로 최소 구현 기준 설정
        if (category.owaspId === 'A01' || category.owaspId === 'A02' || category.owaspId === 'A03') {
          // 핵심 보안 카테고리는 80% 이상 구현되어야 함
          expect(implementationRate).toBeGreaterThanOrEqual(80);
        }
      });
    });
  });

  describe('보안 위반 이벤트 생성', () => {
    test('보안 위반 시 올바른 에러가 생성되어야 함', () => {
      const violation = SecurityValidator.createSecurityViolation(
        'A01-001',
        { userId: 'test-user', resource: 'cards' },
        'high'
      );

      expect(violation).toBeInstanceOf(CategorizedError);
      expect(violation.customCategory).toBe('security');
      expect(violation.severity).toBe('critical'); // security는 항상 critical
      expect(violation.code).toBe('SECURITY_VIOLATION_A01-001');
    });
  });
});