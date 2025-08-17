# T2-Extract Production Dockerfile
# Optimized for Cloud Run deployment with Vertex AI

# Node 20 Alpine for minimal attack surface and smaller image size
FROM node:20-alpine

# Create app directory with proper permissions
WORKDIR /app

# Add required packages for Google Cloud and performance
RUN apk add --no-cache \
    tini \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Copy application files
COPY src ./src
COPY schemas ./schemas
COPY prompts ./prompts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment configuration
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3584"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 8080, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) process.exit(0); else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Expose port
EXPOSE 8080

# Use tini for proper signal handling and zombie reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["npm", "start"]