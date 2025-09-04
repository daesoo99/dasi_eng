/**
 * OpenAPI Documentation Generator
 * @description Zod 스키마를 기반으로 OpenAPI 3.0 문서 자동 생성
 */

import { OpenApiGeneratorV3 as OpenAPIGenerator } from '@asteasolutions/zod-to-openapi';
import { registry } from '../schemas/api';

/**
 * OpenAPI 문서 생성
 */
export function generateOpenAPIDocument() {
  // Simplified document generation without using the generator for now
  return {
    openapi: '3.0.0',
    info: {
      version: '2.0.0',
      title: 'DaSi English Learning API',
      description: `
# DaSi English Learning Platform API

영어 스피킹 학습 플랫폼의 RESTful API 문서입니다.

## 주요 기능

- **카드 관리**: 학습 카드 조회 및 필터링
- **세션 관리**: 학습 세션 생성 및 진행 상태 추적
- **피드백 시스템**: STT 기반 발음 평가 및 피드백
- **진도 추적**: 사용자별 학습 진도 및 분석

## 인증

대부분의 API는 Firebase Authentication을 사용합니다.
\`Authorization: Bearer <firebase-id-token>\` 헤더를 포함해주세요.

## Rate Limiting

- 일반 API: 분당 60회
- 피드백 API: 분당 30회
- 세션 API: 분당 20회

## 오류 처리

모든 API는 표준화된 오류 응답 형식을 따릅니다:

\`\`\`json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "meta": {
    "timestamp": 1693612800000,
    "responseTime": 150,
    "requestId": "req_1693612800000_abc123"
  }
}
\`\`\`

## 캐싱

응답에서 \`meta.cached: true\`인 경우 캐시에서 제공된 데이터입니다.
캐시 TTL은 데이터 타입에 따라 1분-7일 범위입니다.
      `,
      contact: {
        name: 'DaSi Development Team',
        email: 'dev@dasi-english.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.dasi-english.com',
        description: 'Production server'
      },
      {
        url: 'https://api-staging.dasi-english.com',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:8081',
        description: 'Development server'
      }
    ],
    paths: {
      '/api/v2/cards': {
        get: {
          summary: '학습 카드 조회',
          description: '레벨, 스테이지, 난이도 등 다양한 조건으로 학습 카드를 조회합니다.',
          tags: ['Cards'],
          parameters: [
            {
              name: 'level',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 10 },
              description: '학습 레벨 (1-10)'
            },
            {
              name: 'stage', 
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100 },
              description: '스테이지 번호'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
              description: '조회할 카드 수 제한'
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', minimum: 0, default: 0 },
              description: '페이징 오프셋'
            },
            {
              name: 'difficulty',
              in: 'query',
              schema: { type: 'number', minimum: 1, maximum: 5 },
              description: '난이도 필터 (1.0-5.0)'
            }
          ],
          responses: {
            '200': {
              description: '카드 조회 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/GetCardsResponse'
                  }
                }
              }
            },
            '400': {
              description: '잘못된 요청 파라미터',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            },
            '500': {
              description: '서버 내부 오류',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/sessions/start': {
        post: {
          summary: '학습 세션 시작',
          description: '새로운 학습 세션을 시작합니다.',
          tags: ['Sessions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/StartSessionRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: '세션 시작 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StartSessionResponse'
                  }
                }
              }
            },
            '400': {
              description: '잘못된 요청 데이터',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/feedback': {
        post: {
          summary: '발음 피드백 생성',
          description: 'STT 결과를 기반으로 발음 피드백을 생성합니다.',
          tags: ['Feedback'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FeedbackRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: '피드백 생성 성공',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FeedbackResponse'
                  }
                }
              }
            },
            '400': {
              description: '잘못된 요청 데이터',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            },
            '429': {
              description: '요청 한도 초과',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for service-to-service calls'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      },
      {
        ApiKeyAuth: []
      }
    ],
    tags: [
      {
        name: 'Cards',
        description: '학습 카드 관리 API'
      },
      {
        name: 'Sessions', 
        description: '학습 세션 관리 API'
      },
      {
        name: 'Feedback',
        description: '발음 피드백 API'
      },
      {
        name: 'Users',
        description: '사용자 관리 API'
      },
      {
        name: 'Analytics',
        description: '학습 분석 API'
      }
    ]
  };
}

/**
 * OpenAPI JSON 파일 생성
 */
export function generateOpenAPIJSON(): string {
  const doc = generateOpenAPIDocument();
  return JSON.stringify(doc, null, 2);
}

/**
 * Swagger UI용 설정 생성
 */
export function getSwaggerUIConfig() {
  return {
    definition: generateOpenAPIDocument(),
    apis: [], // We're using programmatic definition
  };
}