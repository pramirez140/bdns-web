# Database Structure Documentation

## Overview

This document details the PostgreSQL database structure used for the BDNS (Base de Datos Nacional de Subvenciones) system, including table schemas, indexes, relationships, and optimization strategies.

### Current Database Status (Live System - May 31, 2025)
- ✅ **PostgreSQL 15**: Running in Docker container
- ✅ **Complete Data**: 562,536 grants fully stored
- ✅ **Historical Migration**: ✅ COMPLETED (May 30, 2025)
- ✅ **Full-Text Search**: Spanish language configuration active
- ✅ **Data Integrity**: €882+ billion in financial data tracked
- ✅ **Multi-Organization**: 4,481 unique funding bodies

## Database Configuration

### PostgreSQL Setup (Production Environment)
- **Version**: PostgreSQL 15 (Docker container)
- **Language**: Spanish (for full-text search)
- **Encoding**: UTF8
- **Collation**: Spanish locale support
- **Extensions**: `pg_trgm` (trigram matching), `unaccent` (accent removal)
- **Connection**: `postgresql://bdns_user:bdns_password@postgres:5432/bdns_db`
- **Status**: ✅ **HEALTHY** - Container running with real data

### Connection Details (Current System)
```yaml
# Docker configuration (Active)
POSTGRES_DB: bdns_db
POSTGRES_USER: bdns_user
POSTGRES_PASSWORD: bdns_password
POSTGRES_PORT: 5432
POSTGRES_HOST: postgres  # Docker container name
```

**Connection String**:
```
postgresql://bdns_user:bdns_password@postgres:5432/bdns_db
```

**Health Check**:
```bash
curl http://localhost:3000/api/health
# Returns: {"status": "healthy"}
```

## Main Tables (Current Schema)

### 1. convocatorias (Primary Table)

The primary table storing grant announcements from the BDNS system.

**Current Data**: 562,536 grants with €882+ billion in tracked funding

```sql
CREATE TABLE convocatorias (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(255) UNIQUE NOT NULL,           -- Unique grant code from BDNS
    titulo TEXT NOT NULL,                          -- Grant title
    organo TEXT,                                   -- Issuing organization
    fecha_publicacion DATE,                        -- Publication date
    fecha_inicio_solicitud DATE,                   -- Application start date
    fecha_fin_solicitud DATE,                      -- Application end date
    presupuesto DECIMAL(15,2),                     -- Budget amount in euros
    descripcion TEXT,                              -- Grant description
    full_text_search TSVECTOR,                     -- Full-text search vector
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | SERIAL | Primary key, auto-increment | 1, 2, 3... |
| `codigo` | VARCHAR(255) | Unique identifier from BDNS API | "CONVO-2024-001" |
| `titulo` | TEXT | Grant title/name | "Ayudas para investigación científica" |
| `organo` | TEXT | Issuing government body | "Ministerio de Ciencia e Innovación" |
| `fecha_publicacion` | DATE | When grant was published | 2024-01-15 |
| `fecha_inicio_solicitud` | DATE | Application period start | 2024-02-01 |
| `fecha_fin_solicitud` | DATE | Application deadline | 2024-03-31 |
| `presupuesto` | DECIMAL(15,2) | Total budget in euros | 1500000.00 |
| `descripcion` | TEXT | Detailed description | "Convocatoria destinada a..." |
| `full_text_search` | TSVECTOR | Search vector for PostgreSQL FTS | Generated automatically |
| `created_at` | TIMESTAMP | Record creation time | 2024-01-20 10:30:00 |
| `updated_at` | TIMESTAMP | Last update time | 2024-01-21 15:45:00 |

### 2. sync_status (Sync Tracking)

Tracks synchronization operations and their status.

**Current Status**: Complete migration finished successfully

```sql
CREATE TABLE sync_status (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,               -- 'incremental', 'full', 'complete'
    status VARCHAR(50) NOT NULL,                  -- 'running', 'completed', 'failed'
    total_pages INTEGER,                          -- Total pages to process
    processed_pages INTEGER DEFAULT 0,           -- Pages processed so far
    total_records INTEGER,                        -- Total records found
    inserted_records INTEGER DEFAULT 0,          -- New records inserted
    updated_records INTEGER DEFAULT 0,           -- Existing records updated
    error_message TEXT,                          -- Error details if failed
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER                      -- Total sync time
);
```

### 3. api_logs (Request Monitoring)

Logs API requests and responses for monitoring and debugging.

**Current Activity**: Operational logging of BDNS API requests

```sql
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,               -- API endpoint called
    method VARCHAR(10) NOT NULL,                  -- HTTP method
    parameters JSONB,                             -- Request parameters
    response_status INTEGER,                      -- HTTP response status
    response_time_ms INTEGER,                     -- Response time in milliseconds
    error_message TEXT,                          -- Error details if any
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes (Current Performance Optimization)

### Primary Indexes (Active on Live Data)

```sql
-- Primary key indexes (automatic)
CREATE UNIQUE INDEX convocatorias_pkey ON convocatorias(id);
CREATE UNIQUE INDEX convocatorias_codigo_key ON convocatorias(codigo);

-- Full-text search index
CREATE INDEX idx_convocatorias_fts ON convocatorias USING GIN(full_text_search);

-- Date-based queries
CREATE INDEX idx_convocatorias_fecha_publicacion ON convocatorias(fecha_publicacion);
CREATE INDEX idx_convocatorias_fecha_solicitud ON convocatorias(fecha_inicio_solicitud, fecha_fin_solicitud);

-- Organization filtering
CREATE INDEX idx_convocatorias_organo ON convocatorias(organo);

-- Budget queries
CREATE INDEX idx_convocatorias_presupuesto ON convocatorias(presupuesto) WHERE presupuesto IS NOT NULL;
```

### Performance Indexes (Optimized for 562k+ Records)

```sql
-- Composite index for common queries
CREATE INDEX idx_convocatorias_search_combo ON convocatorias(organo, fecha_publicacion, presupuesto);

-- Partial index for active grants
CREATE INDEX idx_convocatorias_active ON convocatorias(fecha_fin_solicitud) 
WHERE fecha_fin_solicitud >= CURRENT_DATE;

-- Sync status monitoring
CREATE INDEX idx_sync_status_type_date ON sync_status(sync_type, started_at);
```

## Full-Text Search Configuration (Production Ready)

### Spanish Language Support (Currently Active)

```sql
-- Set default text search configuration to Spanish
ALTER DATABASE bdns_db SET default_text_search_config = 'spanish';

-- Create custom search configuration
CREATE TEXT SEARCH CONFIGURATION es_custom (COPY = spanish);
```

### Search Vector Generation (Live System)

The `full_text_search` column is automatically generated using a trigger (optimized for 562k+ grants):

```sql
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_text_search := 
        setweight(to_tsvector('spanish', COALESCE(NEW.titulo, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.organo, '')), 'B') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.descripcion, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_convocatorias_search_vector 
    BEFORE INSERT OR UPDATE ON convocatorias
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

### Search Weight Levels

| Weight | Field | Priority | Use Case |
|--------|-------|----------|----------|
| A | `titulo` | Highest | Primary search term matching |
| B | `organo` | High | Organization-based filtering |
| C | `descripcion` | Medium | Content-based search |

## Query Patterns (Tested on Live Data)

### 1. Full-Text Search (Working on 562k+ Grants)

```sql
-- Basic text search
SELECT titulo, organo, presupuesto, fecha_publicacion
FROM convocatorias 
WHERE full_text_search @@ plainto_tsquery('spanish', 'investigación científica')
ORDER BY ts_rank(full_text_search, plainto_tsquery('spanish', 'investigación científica')) DESC
LIMIT 50;

-- Advanced search with ranking
SELECT 
    titulo,
    organo,
    presupuesto,
    fecha_publicacion,
    ts_rank(full_text_search, query) AS rank
FROM convocatorias, plainto_tsquery('spanish', 'innovación tecnológica') AS query
WHERE full_text_search @@ query
ORDER BY rank DESC, fecha_publicacion DESC;
```

### 2. Date Range Queries

```sql
-- Active grants (still accepting applications)
SELECT * FROM convocatorias
WHERE fecha_fin_solicitud >= CURRENT_DATE
ORDER BY fecha_fin_solicitud ASC;

-- Recently published grants
SELECT * FROM convocatorias
WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fecha_publicacion DESC;
```

### 3. Budget-Based Queries

```sql
-- High-budget grants (over 1M euros)
SELECT titulo, organo, presupuesto
FROM convocatorias
WHERE presupuesto >= 1000000
ORDER BY presupuesto DESC;

-- Budget statistics by organization
SELECT 
    organo,
    COUNT(*) as total_grants,
    SUM(presupuesto) as total_budget,
    AVG(presupuesto) as avg_budget,
    MAX(presupuesto) as max_budget
FROM convocatorias
WHERE presupuesto IS NOT NULL
GROUP BY organo
ORDER BY total_budget DESC;
```

### 4. Organization Analysis

```sql
-- Most active organizations
SELECT 
    organo,
    COUNT(*) as grant_count,
    SUM(presupuesto) as total_budget
FROM convocatorias
GROUP BY organo
ORDER BY grant_count DESC
LIMIT 20;
```

## Data Integrity

### Constraints

```sql
-- Ensure valid date ranges
ALTER TABLE convocatorias 
ADD CONSTRAINT check_date_range 
CHECK (fecha_inicio_solicitud IS NULL OR fecha_fin_solicitud IS NULL OR fecha_inicio_solicitud <= fecha_fin_solicitud);

-- Ensure positive budget
ALTER TABLE convocatorias 
ADD CONSTRAINT check_positive_budget 
CHECK (presupuesto IS NULL OR presupuesto >= 0);

-- Ensure codigo is not empty
ALTER TABLE convocatorias 
ADD CONSTRAINT check_codigo_not_empty 
CHECK (LENGTH(TRIM(codigo)) > 0);
```

### Foreign Key Relationships

Currently, the database uses a single-table design for simplicity. Future enhancements might include:

```sql
-- Potential future tables
CREATE TABLE organizaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Maintenance Procedures

### 1. Regular Vacuum and Analyze

```sql
-- Full vacuum and analyze (weekly)
VACUUM ANALYZE convocatorias;

-- Reindex for performance (monthly)
REINDEX TABLE convocatorias;

-- Update table statistics
ANALYZE convocatorias;
```

### 2. Cleanup Old Sync Logs

```sql
-- Remove sync logs older than 90 days
DELETE FROM sync_status 
WHERE started_at < CURRENT_DATE - INTERVAL '90 days';

-- Remove API logs older than 30 days
DELETE FROM api_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
```

### 3. Monitor Database Size

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

## Backup and Recovery

### 1. Database Backup

```bash
# Full database backup
docker exec bdns-postgres pg_dump -U bdns_user -d bdns_db > backup_$(date +%Y%m%d).sql

# Data-only backup
docker exec bdns-postgres pg_dump -U bdns_user -d bdns_db --data-only > data_backup_$(date +%Y%m%d).sql

# Schema-only backup
docker exec bdns-postgres pg_dump -U bdns_user -d bdns_db --schema-only > schema_backup_$(date +%Y%m%d).sql
```

### 2. Database Restoration

```bash
# Restore full database
docker exec -i bdns-postgres psql -U bdns_user -d bdns_db < backup_20240120.sql

# Restore only data
docker exec -i bdns-postgres psql -U bdns_user -d bdns_db < data_backup_20240120.sql
```

## Performance Metrics (Live System Monitoring)

### 1. Query Performance

```sql
-- Slow query monitoring
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking more than 1 second
ORDER BY mean_time DESC;
```

### 2. Index Efficiency

```sql
-- Unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0;
```

### 3. Cache Hit Ratio

```sql
-- Should be > 95%
SELECT 
    round(
        100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2
    ) AS cache_hit_ratio
FROM pg_stat_database;
```

## Scaling Considerations

### 1. Partitioning Strategy

For very large datasets, consider partitioning by date:

```sql
-- Partition by publication year
CREATE TABLE convocatorias_2024 PARTITION OF convocatorias
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE convocatorias_2025 PARTITION OF convocatorias
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### 2. Read Replicas

For high-read workloads, consider PostgreSQL streaming replication:

```yaml
# docker-compose.yml addition
postgres-replica:
  image: postgres:15
  environment:
    POSTGRES_MASTER_SERVICE: postgres
    POSTGRES_REPLICA_USER: replica_user
```

### 3. Connection Pooling

Implement connection pooling for better resource management:

```yaml
# PgBouncer configuration
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_USER: bdns_user
    DATABASES_PASSWORD: bdns_password
    DATABASES_DBNAME: bdns_db
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 100
```

## Current Database Statistics (Real-Time)

**Live Performance Metrics** (as of May 31, 2025):
```bash
# Get current database statistics
curl http://localhost:3000/api/sync | jq '.data.database_stats'
# Returns:
# {
#   "total_convocatorias": 562536,
#   "convocatorias_abiertas": 29590,
#   "total_organismos": 4481,
#   "importe_total_acumulado": 882065753289.85,
#   "fecha_mas_antigua": "2008-10-08T00:00:00.000Z",
#   "fecha_mas_reciente": "2025-05-30T00:00:00.000Z"
# }
```

**Database Health Check**:
```bash
# Verify database connectivity
curl http://localhost:3000/api/health
# Returns: {"status": "healthy"}

# Check container status
docker-compose ps postgres
# Returns: Up (healthy)
```

**Migration Status**:
- ✅ **Complete Migration**: Historical migration successfully finished
- ✅ **Full Database**: 562,536 grants fully loaded and operational
- ✅ **Performance**: Full-text search optimized for Spanish language
- ✅ **Integrity**: All constraints and indexes functioning properly

## Database Schema Evolution

This database structure is optimized for the BDNS system's requirements, supporting:
- **Fast full-text search** across 562k+ grants (complete historical coverage)
- **Efficient data synchronization** with automatic UPSERT operations
- **Comprehensive grant management** with Spanish language support
- **Real-time statistics** and monitoring capabilities

For API-specific details and endpoints, see `API-CONNECTION.md`.