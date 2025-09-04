/**
 * Documentation Routes - OpenAPI/Swagger Integration
 * @description API 문서화 및 스키마 제공 라우트
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument, generateOpenAPIJSON } from '../shared/openapi/generator';
import { registry } from '../shared/schemas/api';

const router = express.Router();

// OpenAPI 문서 생성
const openApiDocument = generateOpenAPIDocument();

/**
 * Swagger UI 제공
 */
router.use('/swagger', swaggerUi.serve);
router.get('/swagger', swaggerUi.setup(openApiDocument, {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  customSiteTitle: 'DaSi English API Docs',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2
  }
}));

/**
 * OpenAPI JSON 스키마 제공
 */
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(generateOpenAPIJSON());
});

/**
 * OpenAPI YAML 스키마 제공 (옵션)
 */
router.get('/openapi.yaml', async (req, res) => {
  try {
    // YAML conversion would require js-yaml package
    const yaml = await import('js-yaml');
    const yamlContent = yaml.dump(openApiDocument);
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(yamlContent);
  } catch (error) {
    // Fallback to JSON if yaml package is not available
    res.redirect('/docs/openapi.json');
  }
});

/**
 * API 스키마 정보 (메타데이터)
 */
router.get('/schema-info', (req, res) => {
  const schemas = registry.definitions.map((def: any) => def.schemaName || 'unnamed');
  
  res.json({
    success: true,
    data: {
      version: openApiDocument.info.version,
      title: openApiDocument.info.title,
      description: 'Available API schemas and documentation',
      schemas: schemas.sort(),
      endpoints: {
        swagger: '/docs/swagger',
        openapi_json: '/docs/openapi.json',
        openapi_yaml: '/docs/openapi.yaml',
        schema_info: '/docs/schema-info'
      },
      stats: {
        total_schemas: schemas.length,
        total_paths: Object.keys(openApiDocument.paths || {}).length,
        servers: openApiDocument.servers?.length || 0
      }
    },
    meta: {
      timestamp: Date.now(),
      responseTime: 0
    }
  });
});

/**
 * 개발용 스키마 검증 엔드포인트
 */
router.post('/validate/:schemaName', (req, res) => {
  const { schemaName } = req.params;
  const data = req.body;
  
  try {
    // Get schema from registry - simplified approach
    const schema = (registry as any).getDefinition(schemaName);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Schema '${schemaName}' not found`,
        code: 'SCHEMA_NOT_FOUND',
        meta: {
          timestamp: Date.now(),
          available_schemas: registry.definitions.map((def: any) => def.schemaName || 'unnamed')
        }
      });
    }
    
    // Validate data against schema
    const result = schema.safeParse(data);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          valid: true,
          schema: schemaName,
          parsed_data: result.data
        },
        meta: {
          timestamp: Date.now()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        data: {
          valid: false,
          schema: schemaName,
          errors: result.error.errors.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        meta: {
          timestamp: Date.now()
        }
      });
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    res.status(500).json({
      success: false,
      error: 'Schema validation error',
      code: 'INTERNAL_VALIDATION_ERROR',
      data: {
        schema: schemaName,
        error_details: errorMessage
      },
      meta: {
        timestamp: Date.now()
      }
    });
  }
});

/**
 * Health check for documentation service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'api-documentation',
      version: openApiDocument.info.version,
      uptime: process.uptime(),
      schemas_loaded: registry.definitions.length > 0
    },
    meta: {
      timestamp: Date.now(),
      responseTime: 0
    }
  });
});

export default router;