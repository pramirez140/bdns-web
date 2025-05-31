# BDNS Web Configuration Guide

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Database Configuration](#database-configuration)
- [Application Settings](#application-settings)
- [Docker Configuration](#docker-configuration)
- [Nginx Configuration](#nginx-configuration)
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Monitoring Setup](#monitoring-setup)
- [Backup Configuration](#backup-configuration)
- [Troubleshooting](#troubleshooting)

## Environment Configuration

### Environment Files

The application uses different environment files for different stages:

```
.env                  # Default/shared variables
.env.local           # Local overrides (git ignored)
.env.development     # Development environment
.env.production      # Production environment
.env.test           # Test environment
```

### Core Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://bdns_user:bdns_password@localhost:5432/bdns_db

# PostgreSQL Docker Configuration
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com

# BDNS API Configuration
BDNS_API_BASE=https://www.infosubvenciones.es/bdnstrans
BDNS_API_TIMEOUT=30000
BDNS_API_RETRY_ATTEMPTS=3
BDNS_API_RETRY_DELAY=1000

# Sync Configuration
SYNC_BATCH_SIZE=100
SYNC_MAX_CONCURRENT_REQUESTS=2
SYNC_DELAY_BETWEEN_REQUESTS=500
SYNC_MAX_RETRIES=3
SYNC_CIRCUIT_BREAKER_THRESHOLD=10

# Cron Configuration
CRON_SECRET=generate_a_secure_random_string_here
CRON_SYNC_SCHEDULE="0 0 * * *"

# Search Configuration
SEARCH_RESULTS_PER_PAGE=20
SEARCH_MAX_RESULTS=10000
SEARCH_TIMEOUT=5000

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
REDIS_URL=redis://localhost:6379

# PgAdmin Configuration (Optional)
PGADMIN_DEFAULT_EMAIL=admin@bdns.local
PGADMIN_DEFAULT_PASSWORD=change_me_in_production

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ENABLE_ANALYTICS=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Feature Flags
ENABLE_EXPORT=true
ENABLE_API_DOCS=true
ENABLE_RATE_LIMITING=true
```

### Environment Variable Validation

Create a `.env.schema` file to validate environment variables:

```typescript
// env.schema.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().regex(/^\d+$/).transform(Number),
  
  // API
  BDNS_API_BASE: z.string().url(),
  BDNS_API_TIMEOUT: z.string().regex(/^\d+$/).transform(Number),
  
  // Sync
  SYNC_BATCH_SIZE: z.string().regex(/^\d+$/).transform(Number),
  
  // Security
  CRON_SECRET: z.string().min(32),
});

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error}`);
  }
  return parsed.data;
}
```

## Database Configuration

### PostgreSQL Settings

#### Development Configuration

```yaml
# docker-compose.yml (development)
postgres:
  image: postgres:15
  environment:
    POSTGRES_DB: bdns_dev
    POSTGRES_USER: bdns_dev
    POSTGRES_PASSWORD: dev_password
    POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_ES.UTF-8"
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "work_mem=4MB"
    - "-c"
    - "maintenance_work_mem=64MB"
    - "-c"
    - "max_connections=100"
    - "-c"
    - "log_statement=all"
```

#### Production Configuration

```yaml
# docker-compose.yml (production)
postgres:
  image: postgres:15
  environment:
    POSTGRES_DB: bdns_db
    POSTGRES_USER: bdns_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_ES.UTF-8"
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=1GB"
    - "-c"
    - "effective_cache_size=4GB"
    - "-c"
    - "work_mem=16MB"
    - "-c"
    - "maintenance_work_mem=256MB"
    - "-c"
    - "random_page_cost=1.1"
    - "-c"
    - "effective_io_concurrency=200"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "wal_buffers=16MB"
    - "-c"
    - "checkpoint_completion_target=0.9"
    - "-c"
    - "max_wal_size=4GB"
    - "-c"
    - "min_wal_size=1GB"
```

### Connection Pool Configuration

```typescript
// lib/database.ts
import { Pool } from 'pg';

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'bdns-web',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

export const pool = new Pool(poolConfig);
```

### Database Initialization

```sql
-- database/init.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set default configuration
ALTER DATABASE bdns_db SET default_text_search_config = 'pg_catalog.spanish';
ALTER DATABASE bdns_db SET timezone = 'Europe/Madrid';

-- Create custom text search configuration
CREATE TEXT SEARCH CONFIGURATION spanish_unaccent (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
  ALTER MAPPING FOR asciiword, asciihword, hword_asciipart,
                    word, hword, hword_part
  WITH unaccent, spanish_stem;

-- Performance settings
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '4GB';
SELECT pg_reload_conf();
```

## Application Settings

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Output configuration
  output: 'standalone',
  
  // Environment variables
  env: {
    APP_VERSION: process.env.npm_package_version,
    BUILD_TIME: new Date().toISOString(),
  },
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/api/health',
        permanent: false,
      }
    ];
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
    typedRoutes: true,
  }
};

module.exports = nextConfig;
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Docker Configuration

### Production Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

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

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "server.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /data/postgres
      o: bind
```

## Nginx Configuration

### Main Site Configuration

```nginx
# /etc/nginx/sites-available/bdns-web
upstream bdns_backend {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    server localhost:3001 max_fails=3 fail_timeout=30s backup;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=search:10m rate=60r/m;

# Cache configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=bdns_cache:100m max_size=1g inactive=24h use_temp_path=off;

server {
    listen 80;
    server_name bdns.example.com www.bdns.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bdns.example.com www.bdns.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/bdns.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bdns.example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/bdns.example.com/chain.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
    
    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 90s;
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
    
    # Static files
    location /_next/static {
        proxy_cache bdns_cache;
        proxy_cache_valid 200 365d;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_pass http://bdns_backend;
    }
    
    # API endpoints with specific rate limiting
    location /api/search {
        limit_req zone=search burst=10 nodelay;
        proxy_pass http://bdns_backend;
    }
    
    location /api/sync {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://bdns_backend;
    }
    
    # Main application
    location / {
        proxy_pass http://bdns_backend;
        
        # Cache HTML pages
        proxy_cache bdns_cache;
        proxy_cache_valid 200 1h;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_bypass $cookie_session;
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://bdns_backend/api/health;
    }
    
    # Monitoring
    location /nginx-status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

## Security Configuration

### Application Security

```typescript
// middleware/security.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function middleware(request: NextRequest) {
  // Rate limiting
  if (request.nextUrl.pathname.startsWith('/api')) {
    try {
      await limiter.check(request.ip ?? 'anonymous', 10);
    } catch {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  
  // CORS
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

### Environment Security

```bash
# Generate secure secrets
openssl rand -base64 32  # For CRON_SECRET
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 16  # For API keys

# File permissions
chmod 600 .env.local
chmod 644 docker-compose.yml
chmod 755 scripts/*.sh

# Docker security
docker secret create postgres_password - < /dev/urandom | head -c 32
```

## Performance Tuning

### Node.js Optimization

```javascript
// server.js (custom server)
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  
  // Fork workers
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Start server
  require('./server-worker.js');
}
```

### PostgreSQL Tuning

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM convocatorias 
WHERE search_vector @@ plainto_tsquery('spanish', 'educación')
LIMIT 20;

-- Create partial indexes for common queries
CREATE INDEX idx_open_convocatorias 
ON convocatorias(fecha_fin_solicitud) 
WHERE fecha_fin_solicitud >= CURRENT_DATE;

-- Update table statistics
ANALYZE convocatorias;

-- Configure autovacuum
ALTER TABLE convocatorias SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

### Redis Cache Configuration

```javascript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
});

// Cache configuration
export const cacheConfig = {
  // Search results cache
  search: {
    ttl: 3600, // 1 hour
    prefix: 'search:',
  },
  // Organization list cache
  organizations: {
    ttl: 86400, // 24 hours
    prefix: 'org:',
  },
  // Statistics cache
  stats: {
    ttl: 300, // 5 minutes
    prefix: 'stats:',
  },
};
```

## Monitoring Setup

### Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});

// Custom error tracking
export function trackError(error: Error, context?: Record<string, any>) {
  console.error(error);
  Sentry.captureException(error, {
    extra: context,
  });
}
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    services: {},
  };
  
  // Check database
  try {
    await pool.query('SELECT 1');
    checks.services.database = 'connected';
  } catch (error) {
    checks.services.database = 'disconnected';
    checks.status = 'unhealthy';
  }
  
  // Check external API
  try {
    const response = await fetch(`${process.env.BDNS_API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    checks.services.bdns_api = response.ok ? 'reachable' : 'unreachable';
  } catch {
    checks.services.bdns_api = 'unreachable';
  }
  
  // Check Redis (if configured)
  if (process.env.REDIS_URL) {
    try {
      await redis.ping();
      checks.services.cache = 'connected';
    } catch {
      checks.services.cache = 'disconnected';
    }
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

## Backup Configuration

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

# Configuration
BACKUP_DIR="/backup/bdns"
RETENTION_DAYS=30
S3_BUCKET="s3://your-bucket/bdns-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Starting database backup..."
docker exec bdns-postgres pg_dump \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  --format=custom \
  --compress=9 \
  --file=/tmp/bdns_${DATE}.dump

docker cp bdns-postgres:/tmp/bdns_${DATE}.dump $BACKUP_DIR/

# Application backup
echo "Starting application backup..."
tar -czf $BACKUP_DIR/app_${DATE}.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  /opt/bdns-web

# Upload to S3 (if configured)
if [ ! -z "$S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp $BACKUP_DIR/bdns_${DATE}.dump $S3_BUCKET/
  aws s3 cp $BACKUP_DIR/app_${DATE}.tar.gz $S3_BUCKET/
fi

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

### Backup Cron Configuration

```bash
# /etc/cron.d/bdns-backup
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Database backup - Daily at 2 AM
0 2 * * * root /opt/bdns-web/scripts/backup.sh >> /var/log/bdns-backup.log 2>&1

# Application backup - Weekly on Sunday at 3 AM
0 3 * * 0 root /opt/bdns-web/scripts/backup-app.sh >> /var/log/bdns-backup.log 2>&1

# Log rotation
0 4 * * * root /usr/sbin/logrotate /etc/logrotate.d/bdns-web
```

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker logs bdns-postgres --tail 100

# Test connection
docker exec bdns-postgres pg_isready -U bdns_user

# Check connection pool
docker exec bdns-web node -e "
  const { pool } = require('./dist/lib/database');
  pool.query('SELECT NOW()').then(console.log).catch(console.error);
"
```

#### Memory Issues

```bash
# Check memory usage
docker stats --no-stream

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Check for memory leaks
node --inspect server.js
# Then use Chrome DevTools Memory Profiler
```

#### Performance Issues

```bash
# Enable Node.js profiling
NODE_ENV=production node --prof server.js

# Process profiling data
node --prof-process isolate-*.log > profile.txt

# PostgreSQL slow query log
docker exec bdns-postgres psql -U bdns_user -d bdns_db -c "
  SELECT query, mean_exec_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;
"
```

#### Sync Issues

```bash
# Check sync logs
tail -f logs/sync-*.log

# Manually trigger sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'

# Reset sync state
docker exec bdns-postgres psql -U bdns_user -d bdns_db -c "
  TRUNCATE TABLE sync_status RESTART IDENTITY CASCADE;
"
```

This configuration guide provides comprehensive setup instructions for all aspects of the BDNS Web application, from development to production deployment.