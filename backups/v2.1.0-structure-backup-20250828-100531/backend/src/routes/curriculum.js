const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

// Curriculum routes extracted from server.js for better organization and performance

/**
 * GET /api/curriculum/:level
 * Retrieves curriculum data for specific level with optional spec inclusion
 * Cache TTL: 30 minutes for level data
 */
router.get('/:level', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const level = Number(req.params.level);
    const version = (req.header('X-Curriculum-Version') || 'original').toLowerCase();
    const includeSpec = req.query.includeSpec === 'true';

    // Validate level parameter
    if (!level || level < 1 || level > 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid level parameter. Must be between 1 and 10.',
        code: 'INVALID_LEVEL'
      });
    }

    logger.info(`📋 커리큘럼 조회: Level ${level}, Version ${version}`, {
      level,
      version,
      includeSpec,
      ip: req.ip
    });

    // Try cache first (30 min TTL)
    const cacheKey = `curriculum:${level}:${version}:${includeSpec}`;
    const cachedData = await hybridCache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Cache hit for curriculum data', { cacheKey });
      return res.json({ 
        success: true, 
        data: cachedData.data,
        meta: {
          ...cachedData.meta,
          cached: true,
          responseTime: Date.now() - startTime
        }
      });
    }

    // Fetch from Firestore
    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc(version);
    
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      logger.warn('Curriculum not found', { level, version });
      return res.status(404).json({ 
        success: false, 
        error: `Curriculum not found: Level ${level}, Version ${version}`,
        code: 'CURRICULUM_NOT_FOUND'
      });
    }

    const data = snapshot.data();
    
    // Optionally include spec data
    if (includeSpec) {
      const specRef = docRef.collection('specs').doc('content');
      const specSnapshot = await specRef.get();
      if (specSnapshot.exists) {
        data.spec = specSnapshot.data().spec;
      }
    }

    const response = {
      data: data,
      meta: {
        level: level,
        version: version,
        timestamp: Date.now(),
        cached: false,
        responseTime: Date.now() - startTime
      }
    };

    // Cache for 30 minutes
    await hybridCache.set(cacheKey, response, 1800);

    res.json({ 
      success: true, 
      ...response
    });

    logger.info('Curriculum data served successfully', {
      level,
      version,
      responseTime: Date.now() - startTime,
      includeSpec
    });

  } catch (error) {
    logger.error('커리큘럼 조회 실패:', {
      error: error.message,
      stack: error.stack,
      level: req.params.level,
      version: req.header('X-Curriculum-Version')
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/curriculum/upsert
 * Updates or creates curriculum data
 * Invalidates related cache entries
 */
router.post('/upsert', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { level, version, data } = req.body;

    // Validate required fields
    if (!level || !version || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: level, version, data',
        code: 'MISSING_FIELDS'
      });
    }

    logger.info(`📝 커리큘럼 업서트: Level ${level}, Version ${version}`, {
      level,
      version,
      ip: req.ip
    });

    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc(version);

    // Add metadata
    const curriculumData = {
      ...data,
      updatedAt: Date.now(),
      version: version,
      level: Number(level)
    };

    await docRef.set(curriculumData, { merge: true });

    // Invalidate related cache entries
    const cacheKeysToInvalidate = [
      `curriculum:${level}:${version}:true`,
      `curriculum:${level}:${version}:false`
    ];
    
    await Promise.all(
      cacheKeysToInvalidate.map(key => hybridCache.del(key))
    );

    logger.info('Cache invalidated for curriculum update', {
      keys: cacheKeysToInvalidate
    });

    res.json({
      success: true,
      message: 'Curriculum updated successfully',
      meta: {
        level: Number(level),
        version: version,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });

    logger.info('Curriculum upsert completed successfully', {
      level,
      version,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('커리큘럼 업서트 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;