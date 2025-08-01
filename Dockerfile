# Multi-stage build for the client
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
# Use npm install instead of ci when no lock file exists
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy client source
COPY client/ .

# Build the client
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy server package files
COPY server/package*.json ./server/
WORKDIR /app/server
# Use npm install for production dependencies
RUN npm install --only=production

# Copy server source
COPY server/ .

# Copy built client files to be served statically
COPY --from=client-builder /app/client/dist /app/client/dist

# Create data directory
RUN mkdir -p /app/server/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
