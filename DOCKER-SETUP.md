# Docker Structure and Installation Guide

## Overview

This document provides detailed information about the Docker setup for the BDNS (Base de Datos Nacional de Subvenciones) system, including container architecture, configuration, networking, and deployment strategies.

## Container Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │   PostgreSQL    │    │   PgAdmin       │
│   (Frontend +   │◄──►│   Database      │◄──►│   (Optional)    │
│    API Routes)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       Port 3000              Port 5432              Port 5050
```

### Container Responsibilities

| Container | Purpose | Technology | Port |
|-----------|---------|------------|------|
| `nextjs-app` | Web application and API | Next.js 14 + TypeScript | 3000 |
| `postgres` | Database storage | PostgreSQL 15 | 5432 |
| `pgadmin` | Database administration | PgAdmin 4 | 5050 |

## Docker Compose Configuration

### Main Configuration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: bdns-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: bdns_db
      POSTGRES_USER: bdns_user
      POSTGRES_PASSWORD: bdns_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_ES.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./data/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bdns_user -d bdns_db"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - bdns-network

  # Next.js Application
  nextjs-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bdns-nextjs
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://bdns_user:bdns_password@postgres:5432/bdns_db
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - bdns-network
    volumes:
      - ./.next:/app/.next
      - ./data:/app/data

  # PgAdmin (Optional - for database management)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bdns-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@bdns.local
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_CONFIG_SERVER_MODE: "False"
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - bdns-network
    volumes:
      - pgadmin_data:/var/lib/pgadmin

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  bdns-network:
    driver: bridge
```

### Development Override (`docker-compose.dev.yml`)

```yaml
version: '3.8'

services:
  nextjs-app:
    build:
      target: development
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

  postgres:
    ports:
      - "5432:5432"  # Expose for external connections
    environment:
      POSTGRES_DB: bdns_dev_db
      POSTGRES_USER: bdns_dev_user
      POSTGRES_PASSWORD: dev_password
```

## Dockerfile Configuration

### Multi-stage Build

```dockerfile
# Base image for all stages
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# Build stage
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Development stage
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Build Optimization

```dockerfile
# .dockerignore
node_modules
.next
.git
.gitignore
README.md
Dockerfile
docker-compose*.yml
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## Installation Procedures

### 1. Fresh Installation

```bash
# Clone the repository
git clone <repository-url> bdns-web
cd bdns-web

# Create environment file
cp .env.example .env.local

# Build and start services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Development Setup

```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Or use the development script
npm run docker:dev
```

### 3. Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.yml up --build -d

# Initialize database
docker-compose exec nextjs-app npm run sync:complete

# Verify deployment
curl http://localhost:3000/api/health
```

## Environment Configuration

### Environment Variables

```bash
# .env.local
NODE_ENV=production
DATABASE_URL=postgresql://bdns_user:bdns_password@postgres:5432/bdns_db
NEXT_PUBLIC_API_URL=http://localhost:3000

# PostgreSQL Configuration
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=bdns_password

# PgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@bdns.local
PGADMIN_DEFAULT_PASSWORD=admin123
```

### Security Configuration

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://bdns_user:${STRONG_PASSWORD}@postgres:5432/bdns_db

# Use strong passwords
POSTGRES_PASSWORD=${GENERATE_STRONG_PASSWORD}
PGADMIN_DEFAULT_PASSWORD=${GENERATE_STRONG_PASSWORD}

# Restrict network access
POSTGRES_HOST_AUTH_METHOD=md5
```

## Data Persistence

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect bdns-web_postgres_data

# Backup volume
docker run --rm -v bdns-web_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore volume
docker run --rm -v bdns-web_postgres_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_backup_20240120.tar.gz -C /data
```

### Database Initialization

```sql
-- data/init.sql
-- This file runs automatically on first container start

-- Create extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Set default text search configuration
ALTER DATABASE bdns_db SET default_text_search_config = 'spanish';

-- Create tables (handled by application migration)
-- Tables are created automatically by the sync process
```

## Networking

### Internal Communication

```yaml
# Containers communicate via internal network
networks:
  bdns-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Port Mapping

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Next.js | 3000 | 3000 | Web application |
| PostgreSQL | 5432 | 5432 | Database access |
| PgAdmin | 80 | 5050 | Database management |

### Firewall Configuration

```bash
# Production firewall rules
sudo ufw allow 3000/tcp    # Web application
sudo ufw deny 5432/tcp     # Block external DB access
sudo ufw deny 5050/tcp     # Block external PgAdmin access
```

## Health Checks and Monitoring

### Health Check Configuration

```yaml
# PostgreSQL health check
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U bdns_user -d bdns_db"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s

# Next.js health check
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Monitoring Commands

```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Check logs
docker-compose logs postgres
docker-compose logs nextjs-app

# Monitor database connections
docker-compose exec postgres psql -U bdns_user -d bdns_db \
  -c "SELECT count(*) as active_connections FROM pg_stat_activity;"
```

## Maintenance Operations

### 1. Database Maintenance

```bash
# Connect to database
docker-compose exec postgres psql -U bdns_user -d bdns_db

# Run vacuum and analyze
docker-compose exec postgres psql -U bdns_user -d bdns_db \
  -c "VACUUM ANALYZE convocatorias;"

# Check database size
docker-compose exec postgres psql -U bdns_user -d bdns_db \
  -c "SELECT pg_size_pretty(pg_database_size('bdns_db'));"
```

### 2. Log Management

```bash
# Rotate logs
docker-compose logs --since 24h > logs_$(date +%Y%m%d).log

# Clear logs
docker-compose down
docker system prune -f
docker-compose up -d
```

### 3. Updates and Backups

```bash
# Backup before update
./scripts/backup.sh

# Update containers
docker-compose pull
docker-compose up --build -d

# Verify update
docker-compose exec nextjs-app npm run health-check
```

## Scaling and Performance

### 1. Horizontal Scaling

```yaml
# Scale Next.js containers
version: '3.8'
services:
  nextjs-app:
    deploy:
      replicas: 3
    
  # Load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - nextjs-app
```

### 2. Resource Limits

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
  
  nextjs-app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. Performance Tuning

```yaml
# PostgreSQL performance settings
postgres:
  environment:
    # Increase connection limits
    POSTGRES_CONFIG_max_connections: 200
    # Increase shared buffers
    POSTGRES_CONFIG_shared_buffers: 256MB
    # Increase work memory
    POSTGRES_CONFIG_work_mem: 4MB
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U bdns_user
```

#### 2. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change port
docker-compose down
# Edit docker-compose.yml to use different port
docker-compose up -d
```

#### 3. Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a

# Remove old volumes
docker volume prune
```

### Debugging Commands

```bash
# Enter container shell
docker-compose exec nextjs-app sh
docker-compose exec postgres bash

# Check environment variables
docker-compose exec nextjs-app printenv

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/search?q=investigacion
```

## Security Best Practices

### 1. Container Security

```dockerfile
# Use non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Use specific image versions
FROM node:18.17.0-alpine
FROM postgres:15.4
```

### 2. Network Security

```yaml
# Restrict external access
services:
  postgres:
    ports: [] # Remove external port exposure
    expose:
      - "5432" # Only internal access
```

### 3. Secret Management

```bash
# Use Docker secrets
echo "strong_password" | docker secret create postgres_password -

# Reference in compose file
secrets:
  postgres_password:
    external: true
```

This Docker setup provides a robust, scalable, and maintainable deployment for the BDNS system. For application-specific details, see the main `README.md`.