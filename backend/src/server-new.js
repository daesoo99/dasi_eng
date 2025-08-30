/**
 * DASI English API Server v2.2.0
 * Modularized architecture for better maintainability
 * 
 * Original: 2,679 lines -> New: ~100 lines
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import modularized configurations
const { configureAllMiddleware } = require('./config/middleware');
const { configureAllRoutes } = require('./routes/index');
const logger = require('./monitoring/logger');
const { memoryMonitor } = require('./monitoring/memoryMonitor');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL] 
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
const PORT = process.env.PORT || 8081;

function startServer() {
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
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
});

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

module.exports = { app, server, io };