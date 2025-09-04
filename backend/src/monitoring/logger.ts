/**
 * Logger - Structured logging with Pino
 * TypeScript 변환: 커스텀 로그 메서드 + 타입 안전성
 */

import pino from 'pino';
import os from 'os';

// Custom logger interface
interface CustomLogger extends pino.Logger {
  cache(message: string, extra?: Record<string, any>): void;
  queue(message: string, extra?: Record<string, any>): void;
  tts(message: string, extra?: Record<string, any>): void;
  llm(message: string, extra?: Record<string, any>): void;
  stt(message: string, extra?: Record<string, any>): void;
  performance(message: string, extra?: Record<string, any>): void;
}

// Logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: os.hostname(),
    service: 'dasi-backend'
  }
};

// Create base logger
const baseLogger = pino(loggerConfig);

// Extend logger with custom methods
const logger = baseLogger as CustomLogger;

// Add custom methods for different log types
logger.cache = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'cache', ...extra }, message);
};

logger.queue = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'queue', ...extra }, message);
};

logger.tts = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'tts', ...extra }, message);
};

logger.llm = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'llm', ...extra }, message);
};

logger.stt = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'stt', ...extra }, message);
};

logger.performance = (message: string, extra: Record<string, any> = {}) => {
  logger.info({ type: 'performance', ...extra }, message);
};

// Type-safe log level check functions
export const isDebugEnabled = (): boolean => logger.level === 'debug';
export const isInfoEnabled = (): boolean => ['debug', 'info'].includes(logger.level);

// Error logging helper
export const logError = (
  message: string, 
  error: Error | unknown, 
  context: Record<string, any> = {}
): void => {
  const errorInfo = error instanceof Error 
    ? { message: error.message, stack: error.stack, name: error.name }
    : { error: String(error) };
    
  logger.error({ ...context, ...errorInfo }, message);
};

// Performance logging helper
export const logPerformance = (
  operation: string,
  duration: number,
  context: Record<string, any> = {}
): void => {
  logger.performance(`${operation} completed`, {
    duration,
    operation,
    ...context
  });
};

// Request logging helper
export const logRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context: Record<string, any> = {}
): void => {
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger[logLevel]({
    type: 'request',
    method,
    path,
    statusCode,
    duration,
    ...context
  }, `${method} ${path} ${statusCode} ${duration}ms`);
};

export default logger;