/**
 * OWASP Top 10 2021 기반 보안 체크리스트
 * 현재 프로젝트 구현 상태와 개선 필요사항 추적
 */

import { CategorizedError, ErrorFactory } from '../errors/CategorizedError';

export interface SecurityCheck {
  id: string;
  title: string;
  status: 'implemented' | 'partial' | 'missing' | 'not_applicable';
  description: string;
  implementationNotes?: string;
  remediation?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SecurityCategory {
  owaspId: string;
  title: string;
  description: string;
  checks: SecurityCheck[];
}

export const SECURITY_CHECKLIST: SecurityCategory[] = [
  {
    owaspId: 'A01',
    title: 'Broken Access Control',
    description: '부적절한 접근 제어로 인한 무단 정보 접근',
    checks: [
      {
        id: 'A01-001',
        title: 'Firebase ID Token 검증',
        status: 'implemented',
        description: '모든 인증이 필요한 엔드포인트에서 Firebase ID Token 검증',
        implementationNotes: 'FirebaseAuthAdapter.verifyToken() 구현됨',
        priority: 'critical'
      },
      {
        id: 'A01-002', 
        title: '리소스별 권한 체크',
        status: 'implemented',
        description: '사용자별 리소스 접근 권한 세밀한 제어',
        implementationNotes: 'checkPermission() 메서드로 레벨별/구독별 권한 체크',
        priority: 'critical'
      },
      {
        id: 'A01-003',
        title: '사용자 데이터 격리',
        status: 'implemented',
        description: '사용자는 자신의 데이터만 접근 가능',
        implementationNotes: 'UID 필터링으로 세션/프로필 데이터 격리',
        priority: 'critical'
      },
      {
        id: 'A01-004',
        title: 'Admin 권한 분리',
        status: 'partial',
        description: '관리자 권한과 일반 사용자 권한 명확히 분리',
        implementationNotes: 'checkAdminPermission() 구현됨',
        remediation: '관리자 전용 인터페이스 분리, 권한 상승 로깅 강화',
        priority: 'high'
      },
      {
        id: 'A01-005',
        title: 'CORS 정책',
        status: 'partial',
        description: 'Cross-Origin Resource Sharing 제한',
        remediation: '허용 도메인 명시적 설정, preflight 요청 검증',
        priority: 'medium'
      }
    ]
  },

  {
    owaspId: 'A02',
    title: 'Cryptographic Failures',
    description: '암호화 실패로 인한 민감 데이터 노출',
    checks: [
      {
        id: 'A02-001',
        title: 'HTTPS 강제',
        status: 'implemented',
        description: 'Production 환경에서 HTTPS 통신 강제',
        implementationNotes: 'App Engine 자동 HTTPS 리디렉션',
        priority: 'critical'
      },
      {
        id: 'A02-002',
        title: 'JWT Secret 관리',
        status: 'implemented', 
        description: 'Firebase JWT는 Google 인프라에서 관리',
        implementationNotes: 'Firebase Admin SDK 사용으로 자동 처리',
        priority: 'critical'
      },
      {
        id: 'A02-003',
        title: '민감 정보 로깅 방지',
        status: 'partial',
        description: '로그에 패스워드, 토큰 등 민감 정보 기록 금지',
        implementationNotes: '구조화 로깅 시스템에서 일부 마스킹 구현',
        remediation: '자동 민감 정보 탐지 및 마스킹 강화',
        priority: 'high'
      },
      {
        id: 'A02-004',
        title: '저장 데이터 암호화',
        status: 'implemented',
        description: 'Firebase Firestore 자동 암호화',
        implementationNotes: 'Google Cloud 인프라 레벨 암호화',
        priority: 'critical'
      }
    ]
  },

  {
    owaspId: 'A03',
    title: 'Injection',
    description: 'SQL, NoSQL, OS 인젝션 공격',
    checks: [
      {
        id: 'A03-001',
        title: '입력 값 검증',
        status: 'implemented',
        description: 'Zod 스키마 기반 런타임 입력 검증',
        implementationNotes: 'GetCardsInput, CreateSessionInput 등 타입 검증',
        priority: 'critical'
      },
      {
        id: 'A03-002',
        title: 'Firebase SDK 보안',
        status: 'implemented',
        description: 'Firebase SDK는 자동으로 쿼리 파라미터 이스케이프',
        implementationNotes: 'Firestore 쿼리 자동 안전화',
        priority: 'critical'
      },
      {
        id: 'A03-003',
        title: '동적 쿼리 방지',
        status: 'implemented',
        description: '사용자 입력을 직접 쿼리 문자열에 삽입하지 않음',
        implementationNotes: 'Firebase SDK 메서드 사용으로 안전화',
        priority: 'critical'
      }
    ]
  },

  {
    owaspId: 'A04',
    title: 'Insecure Design',
    description: '안전하지 않은 설계',
    checks: [
      {
        id: 'A04-001',
        title: '위협 모델링',
        status: 'partial',
        description: '시스템 위협 요소 분석 및 대응책 수립',
        remediation: '정기적인 위협 모델링 세션, 보안 아키텍처 리뷰',
        priority: 'medium'
      },
      {
        id: 'A04-002',
        title: '보안 설계 원칙',
        status: 'implemented',
        description: 'Secure by Default, Defense in Depth 적용',
        implementationNotes: 'DI 패턴, 에러 카테고리화로 보안 강화',
        priority: 'high'
      }
    ]
  },

  {
    owaspId: 'A05',
    title: 'Security Misconfiguration',
    description: '보안 설정 오류',
    checks: [
      {
        id: 'A05-001',
        title: 'Rate Limiting',
        status: 'partial',
        description: 'API 요청 속도 제한',
        implementationNotes: 'Performance Budget 모니터링 구현',
        remediation: '사용자별, 엔드포인트별 Rate Limit 구현',
        priority: 'high'
      },
      {
        id: 'A05-002',
        title: '에러 메시지 보안',
        status: 'implemented',
        description: '운영 환경에서 민감한 에러 정보 노출 방지',
        implementationNotes: 'CategorizedError.shouldExposeDetails() 구현',
        priority: 'medium'
      },
      {
        id: 'A05-003',
        title: 'Security Headers',
        status: 'missing',
        description: 'CSP, HSTS, X-Frame-Options 등 보안 헤더',
        remediation: 'Express 미들웨어로 보안 헤더 자동 추가',
        priority: 'medium'
      },
      {
        id: 'A05-004',
        title: '불필요한 HTTP 메서드 비활성화',
        status: 'implemented',
        description: 'OPTIONS, TRACE 등 불필요한 메서드 차단',
        implementationNotes: 'Express 라우터에서 필요한 메서드만 허용',
        priority: 'low'
      }
    ]
  },

  {
    owaspId: 'A06',
    title: 'Vulnerable and Outdated Components',
    description: '취약한 구성 요소 사용',
    checks: [
      {
        id: 'A06-001',
        title: '의존성 취약점 스캔',
        status: 'partial',
        description: 'npm audit 등을 통한 정기적 취약점 검사',
        remediation: 'GitHub Dependabot 활성화, CI에 보안 스캔 추가',
        priority: 'high'
      },
      {
        id: 'A06-002',
        title: '최신 버전 유지',
        status: 'partial',
        description: 'Firebase SDK, Express 등 주요 의존성 최신 버전 유지',
        priority: 'medium'
      }
    ]
  },

  {
    owaspId: 'A07',
    title: 'Identification and Authentication Failures',
    description: '식별 및 인증 실패',
    checks: [
      {
        id: 'A07-001',
        title: '다중 인증 실패 감지',
        status: 'partial',
        description: '연속적인 로그인 실패 감지 및 계정 잠금',
        implementationNotes: 'Firebase Auth 자동 처리 + 추가 모니터링',
        remediation: '보안 이벤트 로깅 강화',
        priority: 'medium'
      },
      {
        id: 'A07-002',
        title: '세션 관리',
        status: 'implemented',
        description: 'Firebase ID Token 자동 만료 및 갱신',
        implementationNotes: 'Firebase Auth 자동 처리',
        priority: 'critical'
      },
      {
        id: 'A07-003',
        title: '이메일 인증',
        status: 'implemented',
        description: '민감한 작업 수행 시 이메일 인증 확인',
        implementationNotes: 'checkPermission()에서 emailVerified 체크',
        priority: 'high'
      }
    ]
  },

  {
    owaspId: 'A08',
    title: 'Software and Data Integrity Failures',
    description: '소프트웨어 및 데이터 무결성 실패',
    checks: [
      {
        id: 'A08-001',
        title: '코드 무결성',
        status: 'partial',
        description: 'CI/CD 파이프라인에서 코드 서명 및 검증',
        remediation: 'GitHub Actions에 코드 서명 단계 추가',
        priority: 'medium'
      },
      {
        id: 'A08-002',
        title: '데이터 무결성',
        status: 'implemented',
        description: 'Firebase Firestore 자동 데이터 무결성 보장',
        priority: 'high'
      }
    ]
  },

  {
    owaspId: 'A09',
    title: 'Security Logging and Monitoring Failures',
    description: '보안 로깅 및 모니터링 실패',
    checks: [
      {
        id: 'A09-001',
        title: '보안 이벤트 로깅',
        status: 'implemented',
        description: '인증 실패, 권한 위반 등 보안 이벤트 로깅',
        implementationNotes: 'logSecurityEvent() 메서드 구현',
        priority: 'high'
      },
      {
        id: 'A09-002',
        title: '실시간 모니터링',
        status: 'implemented',
        description: 'Prometheus 메트릭 기반 실시간 보안 모니터링',
        implementationNotes: 'Enhanced Observability 시스템',
        priority: 'high'
      },
      {
        id: 'A09-003',
        title: '로그 무결성',
        status: 'partial',
        description: '로그 변조 방지 및 안전한 저장',
        remediation: '로그 서명, 중앙화된 로그 서버 구축',
        priority: 'medium'
      }
    ]
  },

  {
    owaspId: 'A10',
    title: 'Server-Side Request Forgery (SSRF)',
    description: '서버 측 요청 위조',
    checks: [
      {
        id: 'A10-001',
        title: 'URL 화이트리스트',
        status: 'not_applicable',
        description: '외부 URL 호출 시 허용 목록 검증',
        implementationNotes: '현재 외부 API 호출 없음',
        priority: 'low'
      },
      {
        id: 'A10-002',
        title: '내부 네트워크 접근 차단',
        status: 'implemented',
        description: 'App Engine 환경에서 자동 네트워크 격리',
        priority: 'medium'
      }
    ]
  }
];

/**
 * 보안 체크리스트 검증 실행
 */
export class SecurityValidator {
  /**
   * 전체 보안 상태 평가
   */
  static assessSecurityStatus(): {
    overallScore: number;
    criticalIssues: number;
    highIssues: number;
    recommendations: string[];
  } {
    let totalChecks = 0;
    let implementedChecks = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    const recommendations: string[] = [];

    SECURITY_CHECKLIST.forEach(category => {
      category.checks.forEach(check => {
        totalChecks++;
        
        if (check.status === 'implemented') {
          implementedChecks++;
        } else {
          if (check.priority === 'critical') {
            criticalIssues++;
          } else if (check.priority === 'high') {
            highIssues++;
          }

          if (check.remediation) {
            recommendations.push(`${check.id}: ${check.remediation}`);
          }
        }
      });
    });

    const overallScore = Math.round((implementedChecks / totalChecks) * 100);

    return {
      overallScore,
      criticalIssues,
      highIssues,
      recommendations
    };
  }

  /**
   * 특정 카테고리 보안 검증
   */
  static validateCategory(owaspId: string): SecurityCategory | null {
    return SECURITY_CHECKLIST.find(cat => cat.owaspId === owaspId) || null;
  }

  /**
   * 보안 위반 이벤트 생성
   */
  static createSecurityViolation(
    checkId: string, 
    context: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): CategorizedError {
    return ErrorFactory.security(
      `Security check failed: ${checkId}`,
      `SECURITY_VIOLATION_${checkId}`,
      context
    );
  }
}

export default SECURITY_CHECKLIST;