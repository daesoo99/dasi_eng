/**
 * Validation Schemas
 * @description Zod 기반 입력 검증 스키마 정의
 */

import { z } from 'zod';

/**
 * 기본 ID 검증
 */
export const IdSchema = z.string()
  .min(1, 'ID cannot be empty')
  .max(128, 'ID is too long');

/**
 * 사용자 관련 스키마
 */
export const UserIdSchema = IdSchema;

export const UserLevelSchema = z.number()
  .int('Level must be an integer')
  .min(1, 'Level must be at least 1')
  .max(10, 'Level cannot exceed 10');

export const CreateUserSchema = z.object({
  uid: UserIdSchema,
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().min(1).max(100).optional(),
  level: UserLevelSchema.optional().default(1),
  subscription: z.enum(['free', 'premium']).optional().default('free')
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').optional()
});

/**
 * 카드 관련 스키마
 */
export const CardQuerySchema = z.object({
  level: UserLevelSchema.optional(),
  stage: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  difficulty: z.number().min(1.0).max(5.0).optional(),
  tags: z.array(z.string().min(1)).optional()
});

export const CardIdSchema = IdSchema;

/**
 * 세션 관련 스키마
 */
export const StartSessionSchema = z.object({
  level: UserLevelSchema,
  stage: z.number().int().min(1, 'Stage must be positive'),
  cardCount: z.number().int().min(1).max(50).optional().default(10)
});

export const SubmitAnswerSchema = z.object({
  sessionId: IdSchema,
  cardId: IdSchema,
  userAnswer: z.string().min(1, 'User answer cannot be empty'),
  targetAnswer: z.string().min(1, 'Target answer cannot be empty'),
  score: z.number().min(0).max(100),
  timeSpent: z.number().int().min(0, 'Time spent cannot be negative'),
  attempts: z.number().int().min(1).optional().default(1)
});

/**
 * 점수/피드백 관련 스키마
 */
export const CalculateScoreSchema = z.object({
  userAnswer: z.string().min(1, 'User answer cannot be empty'),
  targetAnswer: z.string().min(1, 'Target answer cannot be empty')
});

export const PronunciationScoreSchema = z.object({
  sttResult: z.string().min(1, 'STT result cannot be empty'),
  targetText: z.string().min(1, 'Target text cannot be empty')
});

/**
 * 페이징 관련 스키마
 */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0)
});

/**
 * 정렬 관련 스키마
 */
export const SortSchema = z.object({
  sortBy: z.enum(['createdAt', 'level', 'score', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * 쿼리 파라미터 공통 스키마
 */
export const QueryParamsSchema = PaginationSchema.merge(SortSchema);

/**
 * HTTP 요청 스키마들
 */
export const GetCardsRequestSchema = z.object({
  query: CardQuerySchema
});

export const GetCardByIdRequestSchema = z.object({
  params: z.object({
    cardId: CardIdSchema
  })
});

export const StartSessionRequestSchema = z.object({
  body: StartSessionSchema
});

export const SubmitAnswerRequestSchema = z.object({
  params: z.object({
    sessionId: IdSchema
  }),
  body: SubmitAnswerSchema.omit({ sessionId: true })
});

export const CompleteSessionRequestSchema = z.object({
  params: z.object({
    sessionId: IdSchema
  })
});

export const CalculateScoreRequestSchema = z.object({
  body: CalculateScoreSchema
});

export const PronunciationScoreRequestSchema = z.object({
  body: PronunciationScoreSchema
});

/**
 * 환경 변수 검증 스키마
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val)).default(8081),
  
  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(val => parseInt(val)).default(5432),
  DB_NAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  
  // Redis
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(val => parseInt(val)).optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // CORS
  CORS_ORIGINS: z.string().optional(),
  
  // Features
  ENABLE_AI_SCORING: z.string().transform(val => val === 'true').optional(),
  ENABLE_ADVANCED_ANALYTICS: z.string().transform(val => val === 'true').optional()
});

/**
 * 스키마 유효성 검사 결과 타입
 */
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodIssue[];
};

/**
 * 스키마 검증 헬퍼 함수
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error.issues };
  }
}

/**
 * Express 미들웨어용 스키마 검증
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateSchema(schema, {
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: result.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      });
    }

    // 검증된 데이터를 req에 추가
    Object.assign(req, result.data);
    next();
  };
}