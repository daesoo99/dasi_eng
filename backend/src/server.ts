/**
 * DASI English API Server v2.2.0 (TypeScript)
 * Modularized architecture for better maintainability
 * 
 * Original: 2,679 lines JS -> New: ~100 lines TS
 */

import express, { Application } from 'express';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from 'dotenv';

// Import modularized configurations
import { configureAllMiddleware } from './config/middleware';
import { configureAllRoutes } from './routes/index';

config(); // Load environment variables

const logger = require('./monitoring/logger');
const { memoryMonitor } = require('./monitoring/memoryMonitor');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app: Application = express();
const server: Server = createServer(app);
const io: SocketIOServer = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL].filter(Boolean) as string[]
      : ["http://localhost:3500", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configure all middleware
configureAllMiddleware(app);

// Configure all routes
configureAllRoutes(app);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'New WebSocket connection');
  
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'WebSocket disconnected');
  });
});

// Global error handling (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Server startup
const PORT: number = parseInt(process.env.PORT || '8081', 10);

function startServer(): void {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info({
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }, 'DASI English API Server started successfully');

    // Start memory monitoring in production
    if (process.env.NODE_ENV === 'production') {
      memoryMonitor.startMonitoring();
      logger.info('Memory monitoring started');
    }
  });
}

// Graceful shutdown handling
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the server
startServer();

export { app, server, io };