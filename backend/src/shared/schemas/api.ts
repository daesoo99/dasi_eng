/**
 * API Schemas - Zod to OpenAPI Integration
 * @description API 계약 정의 및 자동 문서 생성
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

// Zod에 OpenAPI 확장 추가
extendZodWithOpenApi(z);

// Global OpenAPI Registry
export const registry = new OpenAPIRegistry();

// Base Schemas
export const ApiResponseMetaSchema = z.object({
  timestamp: z.number().openapi({
    description: 'Response timestamp (Unix)',
    example: 1693612800000
  }),
  responseTime: z.number().openapi({
    description: 'Response time in milliseconds',
    example: 150
  }),
  requestId: z.string().openapi({
    description: 'Unique request identifier',
    example: 'req_1693612800000_abc123'
  }),
  cached: z.boolean().optional().openapi({
    description: 'Whether response was served from cache',
    example: false
  })
});

export const ApiResponseSchema = z.object({
  success: z.boolean().openapi({
    description: 'Indicates if the request was successful',
    example: true
  }),
  data: z.any().optional().openapi({
    description: 'Response data (structure varies by endpoint)'
  }),
  error: z.string().optional().openapi({
    description: 'Error message if success is false',
    example: 'Invalid input parameters'
  }),
  code: z.string().optional().openapi({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_ERROR'
  }),
  meta: ApiResponseMetaSchema.openapi({
    description: 'Response metadata'
  })
}).openapi({
  description: 'Standard API response format',
  example: {
    success: true,
    data: { /* endpoint-specific data */ },
    meta: {
      timestamp: 1693612800000,
      responseTime: 150,
      requestId: 'req_1693612800000_abc123'
    }
  }
});

// Cards API Schemas
export const GetCardsQuerySchema = z.object({
  level: z.coerce.number().int().min(1).max(10).optional().openapi({
    description: '학습 레벨 (1-10)',
    example: 1
  }),
  stage: z.coerce.number().int().min(1).max(100).optional().openapi({
    description: '스테이지 번호',
    example: 5
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    description: '카드 개수 제한',
    example: 20
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    description: '페이징을 위한 오프셋',
    example: 0
  }),
  difficulty: z.coerce.number().min(1).max(5).optional().openapi({
    description: '난이도 필터 (1.0-5.0)',
    example: 2.5
  }),
  tags: z.array(z.string()).optional().openapi({
    description: '태그 필터',
    example: ['grammar', 'beginner']
  })
}).openapi({
  description: '카드 조회 쿼리 파라미터'
});

export const DrillCardSchema = z.object({
  id: z.string().openapi({
    description: '카드 고유 식별자',
    example: 'card_L1_S1_001'
  }),
  front_ko: z.string().openapi({
    description: '한국어 앞면 텍스트',
    example: '안녕하세요'
  }),
  back_en: z.string().openapi({
    description: '영어 뒷면 텍스트',
    example: 'Hello'
  }),
  level: z.number().int().min(1).max(10).openapi({
    description: '학습 레벨',
    example: 1
  }),
  stage: z.number().int().min(1).openapi({
    description: '스테이지 번호',
    example: 1
  }),
  difficulty: z.number().min(1).max(5).openapi({
    description: '난이도 점수',
    example: 2.5
  }),
  tags: z.array(z.string()).optional().openapi({
    description: '카드 태그',
    example: ['greeting', 'basic']
  }),
  audioUrl: z.string().url().optional().openapi({
    description: '오디오 파일 URL',
    example: 'https://storage.googleapis.com/dasi/audio/hello.mp3'
  })
}).openapi({
  description: '학습 카드 정보'
});

export const GetCardsResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    cards: z.array(DrillCardSchema).openapi({
      description: '카드 목록'
    }),
    total: z.number().int().openapi({
      description: '전체 카드 수',
      example: 150
    }),
    hasMore: z.boolean().openapi({
      description: '추가 페이지 존재 여부',
      example: true
    }),
    page: z.number().int().openapi({
      description: '현재 페이지 번호',
      example: 1
    }),
    totalPages: z.number().int().openapi({
      description: '전체 페이지 수',
      example: 8
    })
  }).openapi({
    description: '카드 조회 응답 데이터'
  })
}).openapi({
  description: '카드 조회 API 응답'
});

// Session API Schemas
export const StartSessionRequestSchema = z.object({
  userId: z.string().optional().openapi({
    description: '사용자 ID (인증된 경우 자동 설정)',
    example: 'user_12345'
  }),
  level: z.number().int().min(1).max(10).openapi({
    description: '학습 레벨',
    example: 2
  }),
  stage: z.number().int().min(1).openapi({
    description: '스테이지 번호',
    example: 3
  }),
  cardIds: z.array(z.string()).optional().openapi({
    description: '특정 카드 ID 목록 (선택사항)',
    example: ['card_L2_S3_001', 'card_L2_S3_002']
  })
}).openapi({
  description: '학습 세션 시작 요청'
});

export const SessionDataSchema = z.object({
  sessionId: z.string().openapi({
    description: '세션 고유 식별자',
    example: 'ses_1693612800000_abc123'
  }),
  userId: z.string().openapi({
    description: '사용자 ID',
    example: 'user_12345'
  }),
  level: z.number().int().openapi({
    description: '학습 레벨',
    example: 2
  }),
  stage: z.number().int().openapi({
    description: '스테이지 번호',
    example: 3
  }),
  cardIds: z.array(z.string()).openapi({
    description: '세션 카드 ID 목록',
    example: ['card_L2_S3_001', 'card_L2_S3_002']
  }),
  startedAt: z.string().datetime().openapi({
    description: '세션 시작 시간 (ISO 8601)',
    example: '2023-09-01T10:00:00.000Z'
  }),
  status: z.enum(['active', 'completed', 'abandoned']).openapi({
    description: '세션 상태',
    example: 'active'
  }),
  progress: z.object({
    totalCards: z.number().int().openapi({
      description: '전체 카드 수',
      example: 10
    }),
    completedCards: z.number().int().openapi({
      description: '완료된 카드 수',
      example: 3
    }),
    correctAnswers: z.number().int().openapi({
      description: '정답 수',
      example: 2
    }),
    incorrectAnswers: z.number().int().openapi({
      description: '오답 수',
      example: 1
    })
  }).openapi({
    description: '세션 진행 상황'
  }),
  createdAt: z.string().datetime().openapi({
    description: '세션 생성 시간 (ISO 8601)',
    example: '2023-09-01T10:00:00.000Z'
  })
}).openapi({
  description: '학습 세션 데이터'
});

export const StartSessionResponseSchema = ApiResponseSchema.extend({
  data: SessionDataSchema.openapi({
    description: '생성된 세션 정보'
  })
}).openapi({
  description: '세션 시작 API 응답'
});

// Feedback API Schemas
export const FeedbackRequestSchema = z.object({
  front_ko: z.string().min(1).openapi({
    description: '한국어 원문',
    example: '안녕하세요'
  }),
  sttText: z.string().min(1).openapi({
    description: 'STT로 변환된 사용자 발화',
    example: 'Hello there'
  }),
  target_en: z.string().min(1).openapi({
    description: '목표 영어 문장',
    example: 'Hello'
  })
}).openapi({
  description: '피드백 생성 요청'
});

export const FeedbackResultSchema = z.object({
  correct: z.boolean().openapi({
    description: '정답 여부',
    example: true
  }),
  score: z.number().int().min(0).max(100).openapi({
    description: '점수 (0-100)',
    example: 85
  }),
  feedback: z.string().openapi({
    description: '피드백 메시지',
    example: '훌륭해요! 정확한 발음입니다. 🎉'
  }),
  suggestions: z.array(z.string()).openapi({
    description: '개선 제안 목록',
    example: ['발음을 조금 더 명확하게 해보세요']
  }),
  userAnswer: z.string().openapi({
    description: '사용자 답변',
    example: 'Hello there'
  }),
  targetAnswer: z.string().openapi({
    description: '목표 답변',
    example: 'Hello'
  }),
  similarity: z.number().min(0).max(1).openapi({
    description: '유사도 점수 (0-1)',
    example: 0.92
  })
}).openapi({
  description: '피드백 결과'
});

export const FeedbackResponseSchema = ApiResponseSchema.extend({
  data: FeedbackResultSchema.openapi({
    description: '피드백 분석 결과'
  })
}).openapi({
  description: '피드백 생성 API 응답'
});

// Register all schemas
registry.register('ApiResponse', ApiResponseSchema);
registry.register('ApiResponseMeta', ApiResponseMetaSchema);

registry.register('GetCardsQuery', GetCardsQuerySchema);
registry.register('DrillCard', DrillCardSchema);
registry.register('GetCardsResponse', GetCardsResponseSchema);

registry.register('StartSessionRequest', StartSessionRequestSchema);
registry.register('SessionData', SessionDataSchema);
registry.register('StartSessionResponse', StartSessionResponseSchema);

registry.register('FeedbackRequest', FeedbackRequestSchema);
registry.register('FeedbackResult', FeedbackResultSchema);
registry.register('FeedbackResponse', FeedbackResponseSchema);

// Export validation functions
export const validateGetCardsQuery = (data: unknown) => GetCardsQuerySchema.safeParse(data);
export const validateStartSessionRequest = (data: unknown) => StartSessionRequestSchema.safeParse(data);
export const validateFeedbackRequest = (data: unknown) => FeedbackRequestSchema.safeParse(data);

// Export for type inference
export type GetCardsQuery = z.infer<typeof GetCardsQuerySchema>;
export type DrillCard = z.infer<typeof DrillCardSchema>;
export type GetCardsResponse = z.infer<typeof GetCardsResponseSchema>;
export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type FeedbackResult = z.infer<typeof FeedbackResultSchema>;