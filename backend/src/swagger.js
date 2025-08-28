/**
 * Swagger API Documentation Configuration for DASI English Learning Platform
 * Flutter-compatible OpenAPI 3.0 specification
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DASI English Learning API',
      version: '1.0.0',
      description: `
        # DASI English Learning Platform API
        
        스마트 영어 학습 플랫폼을 위한 RESTful API입니다.
        
        ## 주요 기능
        - 🧠 **스마트 리뷰 시스템**: Ebbinghaus 망각 곡선 기반
        - 📚 **10단계 학습 커리큘럼**: 기초부터 고급까지
        - 🎯 **개인화 학습**: 사용자별 맞춤 진도 관리
        - 🔊 **음성 학습**: STT/TTS 통합 시스템
        - 🏆 **게이미피케이션**: 경험치, 레벨, 스트릭 시스템
        
        ## Flutter 모바일 앱 호환
        이 API는 Flutter dio 패키지와 완전 호환됩니다.
        
        ## 인증
        Firebase Authentication 토큰이 필요합니다.
      `,
      contact: {
        name: 'DASI Team',
        email: 'support@dasi-english.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://api.dasi-english.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase Authentication JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['uid', 'email'],
          properties: {
            uid: {
              type: 'string',
              description: 'Firebase 사용자 UID',
              example: 'abc123def456'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '사용자 이메일',
              example: 'user@example.com'
            },
            displayName: {
              type: 'string',
              description: '사용자 표시 이름',
              example: '김영희'
            },
            currentLevel: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: '현재 학습 레벨 (1-10)',
              example: 3
            },
            currentPhase: {
              type: 'integer',
              minimum: 1,
              maximum: 6,
              description: '현재 학습 단계 (1-6)',
              example: 2
            },
            totalExp: {
              type: 'integer',
              minimum: 0,
              description: '총 경험치',
              example: 1250
            },
            streakDays: {
              type: 'integer',
              minimum: 0,
              description: '연속 학습 일수',
              example: 7
            },
            reviewStats: {
              type: 'object',
              properties: {
                totalReviews: {
                  type: 'integer',
                  description: '총 복습 횟수'
                },
                accuracy: {
                  type: 'number',
                  format: 'float',
                  minimum: 0,
                  maximum: 1,
                  description: '정답률 (0-1)'
                },
                avgQuality: {
                  type: 'number',
                  format: 'float',
                  description: '평균 응답 품질'
                }
              }
            }
          }
        },
        ContentItem: {
          type: 'object',
          required: ['id', 'level', 'phase', 'stage'],
          properties: {
            id: {
              type: 'string',
              description: '콘텐츠 고유 ID',
              example: 'Lv1-P1-S01'
            },
            level: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: '학습 레벨',
              example: 1
            },
            phase: {
              type: 'integer',
              minimum: 1,
              maximum: 6,
              description: '학습 단계',
              example: 1
            },
            stage: {
              type: 'integer',
              minimum: 1,
              description: '스테이지 번호',
              example: 1
            },
            title: {
              type: 'string',
              description: '콘텐츠 제목',
              example: '기본 인사하기'
            },
            description: {
              type: 'string',
              description: '콘텐츠 설명',
              example: '간단한 인사 표현을 학습합니다'
            },
            patterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  korean: {
                    type: 'string',
                    example: '안녕하세요'
                  },
                  english: {
                    type: 'string',
                    example: 'Hello'
                  },
                  phonetic: {
                    type: 'string',
                    example: '[həˈloʊ]'
                  }
                }
              }
            },
            difficulty: {
              type: 'string',
              enum: ['EASY', 'MEDIUM', 'HARD'],
              description: '난이도',
              example: 'EASY'
            }
          }
        },
        ReviewCard: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '리뷰 카드 ID'
            },
            userId: {
              type: 'string',
              description: '사용자 ID'
            },
            itemId: {
              type: 'string',
              description: '학습 항목 ID'
            },
            easeFactor: {
              type: 'number',
              format: 'float',
              description: 'SuperMemo 난이도 계수'
            },
            interval: {
              type: 'number',
              format: 'float',
              description: '복습 간격 (일)'
            },
            nextReview: {
              type: 'string',
              format: 'date-time',
              description: '다음 복습 예정 시간'
            },
            memoryStrength: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: '기억 강도 (0-1)'
            },
            learningState: {
              type: 'string',
              enum: ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'],
              description: '학습 상태'
            }
          }
        },
        ExperienceGain: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: '사용자 ID'
            },
            expGained: {
              type: 'integer',
              description: '획득한 경험치'
            },
            totalExp: {
              type: 'integer',
              description: '총 경험치'
            },
            levelUp: {
              type: 'boolean',
              description: '레벨업 여부'
            },
            newLevel: {
              type: 'integer',
              description: '새로운 레벨 (레벨업시)'
            },
            bonuses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['STREAK', 'PERFECT', 'SPEED'],
                    description: '보너스 타입'
                  },
                  amount: {
                    type: 'integer',
                    description: '보너스 경험치'
                  }
                }
              }
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '요청 성공 여부'
            },
            message: {
              type: 'string',
              description: '응답 메시지'
            },
            data: {
              description: '응답 데이터'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '에러 메시지'
            },
            code: {
              type: 'string',
              description: '에러 코드'
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/controllers/*.ts',
    './src/server.js'
  ]
};

const specs = swaggerJsdoc(options);

// Swagger UI 커스텀 설정 (Flutter 개발자 친화적)
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #1976d2; }
    .swagger-ui .scheme-container { background: #f5f5f5; padding: 10px; }
  `,
  customSiteTitle: 'DASI API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
  }
};

module.exports = (app) => {
  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Swagger UI endpoint
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
  
  // Flutter용 간단한 API 정보 엔드포인트
  app.get('/api/info', (req, res) => {
    res.json({
      name: 'DASI English Learning API',
      version: '1.0.0',
      description: 'Flutter-compatible REST API',
      endpoints: {
        documentation: '/docs',
        openapi_spec: '/api-docs.json',
        health: '/health'
      },
      flutter: {
        recommended_package: 'dio',
        base_url: req.get('host'),
        authentication: 'Bearer token required'
      }
    });
  });

  console.log('\n🚀 API Documentation initialized!');
  console.log(`📖 Swagger UI: http://localhost:8080/docs`);
  console.log(`📄 OpenAPI JSON: http://localhost:8080/api-docs.json`);
  console.log(`📱 Flutter Info: http://localhost:8080/api/info`);
};