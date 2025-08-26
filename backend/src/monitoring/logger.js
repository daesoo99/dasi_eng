const pino = require('pino');

const logger = pino({
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
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: require('os').hostname(),
    service: 'dasi-backend'
  }
});

// Add custom methods for different log types
logger.cache = (message, extra = {}) => {
  logger.info({ type: 'cache', ...extra }, message);
};

logger.queue = (message, extra = {}) => {
  logger.info({ type: 'queue', ...extra }, message);
};

logger.tts = (message, extra = {}) => {
  logger.info({ type: 'tts', ...extra }, message);
};

logger.llm = (message, extra = {}) => {
  logger.info({ type: 'llm', ...extra }, message);
};

logger.stt = (message, extra = {}) => {
  logger.info({ type: 'stt', ...extra }, message);
};

logger.performance = (message, extra = {}) => {
  logger.info({ type: 'performance', ...extra }, message);
};

module.exports = logger;