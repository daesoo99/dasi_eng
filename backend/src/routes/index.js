/**
 * Routes Index - Central Router Configuration
 * 모든 라우터를 통합 관리
 */

const express = require('express');
const { register } = require('../config/prometheus');
const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

// Import existing routers
const curriculumRouter = require('./curriculum');
const cardsRouter = require('./cards');
const sessionsRouter = require('./sessions');
const feedbackRouter = require('./feedback');

/**
 * Configure system routes (health, metrics, etc.)
 */
function configureSystemRoutes(app) {
  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
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
  app.get('/health', (req, res) => {
    const cacheStats = hybridCache.getStats();
    res.json({ 
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
    });
  });

  // Favicon handler
  app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'DASI English API Server',
      version: '2.2.0',
      documentation: '/api-docs',
      health: '/health',
      metrics: '/metrics'
    });
  });
}

/**
 * Configure API routes
 */
function configureApiRoutes(app) {
  // Mount existing routers
  app.use('/api/curriculum', curriculumRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/feedback', feedbackRouter);
}

/**
 * Configure all routes
 */
function configureAllRoutes(app) {
  configureSystemRoutes(app);
  configureApiRoutes(app);
}

module.exports = {
  configureAllRoutes,
  configureSystemRoutes,
  configureApiRoutes
};