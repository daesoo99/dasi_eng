# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dasi -u 1001

# Copy package files first for better Docker layer caching
COPY --chown=dasi:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=dasi:nodejs . .

# Create necessary directories
RUN mkdir -p logs && \
    chown -R dasi:nodejs logs

# Switch to non-root user
USER dasi

# Expose the port the app runs on
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { host: 'localhost', port: process.env.PORT || 8080, path: '/health', timeout: 2000 }; \
  const req = http.request(options, (res) => { \
    if (res.statusCode === 200) process.exit(0); else process.exit(1); \
  }); \
  req.on('error', () => process.exit(1)); \
  req.end();"

# Default environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV LOG_LEVEL=info

# Start the application
CMD ["node", "src/server.js"]