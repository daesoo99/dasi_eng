/**
 * Routes Index - Central Router Configuration (TypeScript)
 * 모든 라우터를 통합 관리
 */

import { Application, Request, Response } from 'express';
import { register } from '../config/prometheus';

const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

// Import existing routers
const curriculumRouter = require('./curriculum');
const cardsRouter = require('./cards');
const sessionsRouter = require('./sessions');
const feedbackRouter = require('./feedback');

// Import TypeScript routers
const userRouter = require('./user');
const contentRouter = require('./content');
const expRouter = require('./exp');

interface HealthCheckResponse {
  success: boolean;
  status: string;
  timestamp: string;
  cache: any;
  availableLevels: number[];
  features: string[];
}

interface RootResponse {
  success: boolean;
  message: string;
  version: string;
  documentation: string;
  health: string;
  metrics: string;
}

/**
 * Configure system routes (health, metrics, etc.)
 */
function configureSystemRoutes(app: Application): void {
  // Prometheus metrics endpoint
  app.get('/metrics', async (req: Request, res: Response): Promise<void> => {
    try {
      const cacheStats = hybridCache.getStats();
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Failed to generate metrics', error);
      res.status(500).send('Internal server error');
    }
  });

  // Health check with cache status
  app.get('/health', (req: Request, res: Response): void => {
    const cacheStats = hybridCache.getStats();
    const response: HealthCheckResponse = { 
      success: true, 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      availableLevels: [1, 2, 3, 4, 5, 6],
      features: [
        'level-1-local', 
        'personalized-packs', 
        'scenario-dialogue', 
        'random-review', 
        'redis-cache', 
        'prometheus-metrics'
      ]
    };
    res.json(response);
  });

  // Favicon handler
  app.get('/favicon.ico', (req: Request, res: Response): void => {
    res.status(204).send();
  });

  // Root endpoint
  app.get('/', (req: Request, res: Response): void => {
    const response: RootResponse = {
      success: true,
      message: 'DASI English API Server',
      version: '2.2.0',
      documentation: '/api-docs',
      health: '/health',
      metrics: '/metrics'
    };
    res.json(response);
  });
}

/**
 * Configure API routes
 */
function configureApiRoutes(app: Application): void {
  // Mount existing routers
  app.use('/api/curriculum', curriculumRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/feedback', feedbackRouter);
  
  // Mount TypeScript routers
  app.use('/api/users', userRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/exp', expRouter);
}

/**
 * Configure all routes
 */
function configureAllRoutes(app: Application): void {
  configureSystemRoutes(app);
  configureApiRoutes(app);
}

export {
  configureAllRoutes,
  configureSystemRoutes,
  configureApiRoutes
};