/**
 * Express Middleware Configuration
 * 공통 미들웨어 설정 분리
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const onFinished = require('on-finished');

const logger = require('../monitoring/logger');
const { httpReqDuration, apiRequestsTotal } = require('./prometheus');

/**
 * Security middleware configuration
 */
function configureSecurityMiddleware(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
}

/**
 * Rate limiting configuration
 */
function configureRateLimiting(app) {
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 120, // Limit each IP to 120 requests per windowMs
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      logger.warn({
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      }, 'Rate limit exceeded');
      res.status(429).json({
        error: 'Too many requests from this IP',
        retryAfter: '1 minute'
      });
    }
  });

  app.use('/api/', limiter);
}

/**
 * CORS configuration
 */
function configureCors(app) {
  app.use(cors({
    origin: function (origin, callback) {
      // 개발 환경에서는 origin이 undefined인 경우(Postman, curl 등) 허용
      if (process.env.NODE_ENV === 'development' && !origin) {
        return callback(null, true);
      }
      
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL]
        : [
            "http://localhost:3016", 
            "http://localhost:3017", 
            "http://localhost:3018", 
            "http://localhost:3019", 
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:8080",
            "http://127.0.0.1:3016", 
            "http://127.0.0.1:3017", 
            "http://127.0.0.1:3018", 
            "http://127.0.0.1:3019", 
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:8080",
            process.env.FRONTEND_URL
          ].filter(Boolean);

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Curriculum-Version", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count", "X-Page-Count"],
    optionsSuccessStatus: 200,
    preflightContinue: false
  }));
}

/**
 * Body parsing middleware
 */
function configureBodyParsing(app) {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
}

/**
 * Logging middleware
 */
function configureLogging(app) {
  app.use(pinoHttp({ 
    logger,
    genReqId: () => Math.random().toString(36).substr(2, 9)
  }));
}

/**
 * Metrics and timing middleware
 */
function configureMetrics(app) {
  app.use((req, res, next) => {
    const start = Date.now();
    
    onFinished(res, () => {
      const duration = Date.now() - start;
      const route = req.route ? req.route.path : req.path;
      
      // Record HTTP request duration
      httpReqDuration
        .labels(req.method, route, res.statusCode)
        .observe(duration);
      
      // Count API requests
      apiRequestsTotal
        .labels(req.method, req.path, res.statusCode)
        .inc();
      
      logger.info({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }, 'HTTP Request completed');
    });
    
    next();
  });
}

/**
 * Configure all middleware
 */
function configureAllMiddleware(app) {
  configureSecurityMiddleware(app);
  configureRateLimiting(app);
  configureCors(app);
  configureBodyParsing(app);
  configureLogging(app);
  configureMetrics(app);
}

module.exports = {
  configureAllMiddleware,
  configureSecurityMiddleware,
  configureRateLimiting,
  configureCors,
  configureBodyParsing,
  configureLogging,
  configureMetrics
};