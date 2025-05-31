# BDNS Web Migration Guide

## Table of Contents

- [Version Migration](#version-migration)
- [Database Migrations](#database-migrations)
- [API Migrations](#api-migrations)
- [Docker Migration](#docker-migration)
- [Data Migration](#data-migration)
- [Breaking Changes](#breaking-changes)
- [Rollback Procedures](#rollback-procedures)

## Version Migration

### From v0.x to v1.0.0

#### Major Changes

1. **New Features**:
   - Organization name variations tracking
   - Advanced filtering options (typology, distribution method, etc.)
   - URL state management
   - Improved search persistence
   - Enhanced sync monitoring

2. **Database Schema Updates**:
   - New columns in `convocatorias` table
   - New indexes for performance
   - Updated search vectors

3. **API Changes**:
   - New endpoints for organizations
   - Enhanced search parameters
   - Improved error responses

#### Migration Steps

```bash
# 1. Backup current database
docker exec bdns-postgres pg_dump -U bdns_user -d bdns_db > backup_v0.sql

# 2. Stop current application
docker-compose down

# 3. Pull latest code
git pull origin main

# 4. Update environment variables
cp .env.local .env.local.backup
# Add new variables from .env.example

# 5. Run database migrations
docker-compose up -d postgres
docker-compose run --rm web npm run migrate

# 6. Rebuild and start application
docker-compose up -d --build

# 7. Verify migration
curl http://localhost:3000/api/health
```

## Database Migrations

### Migration System Setup

```typescript
// migrations/001_initial_schema.sql
BEGIN;

-- Create migrations table
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if migration was already executed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE filename = '001_initial_schema.sql') THEN
        -- Your migration SQL here
        
        -- Record migration
        INSERT INTO migrations (filename) VALUES ('001_initial_schema.sql');
    END IF;
END $$;

COMMIT;
```

### Adding New Columns

```sql
-- migrations/002_add_filtering_columns.sql
BEGIN;

DO $$
BEGIN
    -- Add tipologia column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convocatorias' AND column_name = 'tipologia'
    ) THEN
        ALTER TABLE convocatorias ADD COLUMN tipologia VARCHAR(100);
        CREATE INDEX idx_convocatorias_tipologia ON convocatorias(tipologia);
    END IF;
    
    -- Add forma_canalizacion column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convocatorias' AND column_name = 'forma_canalizacion'
    ) THEN
        ALTER TABLE convocatorias ADD COLUMN forma_canalizacion VARCHAR(100);
        CREATE INDEX idx_convocatorias_forma_canalizacion ON convocatorias(forma_canalizacion);
    END IF;
    
    -- Add procedimiento_concesion column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'convocatorias' AND column_name = 'procedimiento_concesion'
    ) THEN
        ALTER TABLE convocatorias ADD COLUMN procedimiento_concesion VARCHAR(100);
        CREATE INDEX idx_convocatorias_procedimiento_concesion ON convocatorias(procedimiento_concesion);
    END IF;
    
    -- Record migration
    INSERT INTO migrations (filename) VALUES ('002_add_filtering_columns.sql')
    ON CONFLICT (filename) DO NOTHING;
END $$;

COMMIT;
```

### Updating Search Indexes

```sql
-- migrations/003_update_search_indexes.sql
BEGIN;

DO $$
BEGIN
    -- Drop old search vector
    DROP TRIGGER IF EXISTS update_convocatorias_search_vector ON convocatorias;
    DROP FUNCTION IF EXISTS update_search_vector();
    
    -- Create enhanced search vector function
    CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $func$
    BEGIN
        NEW.search_vector := 
            setweight(to_tsvector('spanish', COALESCE(NEW.titulo, '')), 'A') ||
            setweight(to_tsvector('spanish', COALESCE(NEW.desc_organo, '')), 'B') ||
            setweight(to_tsvector('spanish', COALESCE(NEW.descripcion_br, '')), 'C') ||
            setweight(to_tsvector('spanish', COALESCE(NEW.tipologia, '')), 'D') ||
            setweight(to_tsvector('spanish', COALESCE(NEW.finalidad, '')), 'D');
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Create new trigger
    CREATE TRIGGER update_convocatorias_search_vector 
        BEFORE INSERT OR UPDATE ON convocatorias
        FOR EACH ROW EXECUTE FUNCTION update_search_vector();
    
    -- Rebuild search vectors for existing data
    UPDATE convocatorias SET search_vector = 
        setweight(to_tsvector('spanish', COALESCE(titulo, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(desc_organo, '')), 'B') ||
        setweight(to_tsvector('spanish', COALESCE(descripcion_br, '')), 'C') ||
        setweight(to_tsvector('spanish', COALESCE(tipologia, '')), 'D') ||
        setweight(to_tsvector('spanish', COALESCE(finalidad, '')), 'D');
    
    -- Record migration
    INSERT INTO migrations (filename) VALUES ('003_update_search_indexes.sql')
    ON CONFLICT (filename) DO NOTHING;
END $$;

COMMIT;
```

### Running Migrations

```javascript
// scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    // Run each migration
    for (const file of sqlFiles) {
      const { rows } = await pool.query(
        'SELECT 1 FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (rows.length === 0) {
        console.log(`Running migration: ${file}`);
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        console.log(`Completed: ${file}`);
      } else {
        console.log(`Skipping: ${file} (already executed)`);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
```

## API Migrations

### Backward Compatibility

```typescript
// app/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Support old parameter names for backward compatibility
  const query = searchParams.get('query') || searchParams.get('q');
  const organo = searchParams.get('organoConvocante') || searchParams.get('organo');
  const minAmount = searchParams.get('importeMinimo') || searchParams.get('minAmount');
  
  // New parameters (v1.0.0+)
  const tipologia = searchParams.get('tipologia');
  const formaCanalizacion = searchParams.get('formaCanalizacion');
  const procedimientoConcesion = searchParams.get('procedimientoConcesion');
  
  // ... rest of implementation
}
```

### API Versioning

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // API versioning
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v')) {
    // Redirect unversioned API calls to v1
    const newPath = pathname.replace('/api/', '/api/v1/');
    return NextResponse.redirect(new URL(newPath, request.url));
  }
  
  return NextResponse.next();
}
```

### Deprecation Notices

```typescript
// lib/api-response.ts
export function createResponse(data: any, deprecated?: string[]) {
  const response = {
    success: true,
    data,
    _metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1'
    }
  };
  
  if (deprecated && deprecated.length > 0) {
    response._metadata.deprecations = deprecated.map(field => ({
      field,
      message: `This field is deprecated and will be removed in v2.0.0`,
      alternative: getAlternativeField(field)
    }));
  }
  
  return NextResponse.json(response);
}
```

## Docker Migration

### Updating Docker Images

```yaml
# docker-compose.migrate.yml
version: '3.8'

services:
  # Temporary migration container
  migrator:
    build:
      context: .
      dockerfile: Dockerfile.migrate
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OLD_DATABASE_URL=${OLD_DATABASE_URL}
    volumes:
      - ./migrations:/app/migrations
      - ./scripts:/app/scripts
    command: npm run migrate:all
    depends_on:
      postgres:
        condition: service_healthy

  # New PostgreSQL version
  postgres-new:
    image: postgres:16  # Upgrading from 15 to 16
    volumes:
      - postgres_new_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

### PostgreSQL Version Upgrade

```bash
#!/bin/bash
# scripts/upgrade-postgres.sh

OLD_VERSION=15
NEW_VERSION=16
BACKUP_FILE="postgres_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Starting PostgreSQL upgrade from $OLD_VERSION to $NEW_VERSION"

# 1. Backup current database
echo "Creating backup..."
docker exec bdns-postgres-$OLD_VERSION pg_dumpall -U postgres > $BACKUP_FILE

# 2. Stop old container
echo "Stopping old PostgreSQL..."
docker-compose stop postgres

# 3. Start new PostgreSQL
echo "Starting new PostgreSQL..."
docker-compose -f docker-compose.yml -f docker-compose.migrate.yml up -d postgres-new

# 4. Wait for new PostgreSQL to be ready
echo "Waiting for new PostgreSQL..."
sleep 10

# 5. Restore backup
echo "Restoring database..."
docker exec -i bdns-postgres-$NEW_VERSION psql -U postgres < $BACKUP_FILE

# 6. Update docker-compose.yml to use new version
echo "Updating configuration..."
sed -i "s/postgres:$OLD_VERSION/postgres:$NEW_VERSION/g" docker-compose.yml

# 7. Restart application
echo "Restarting application..."
docker-compose up -d

echo "PostgreSQL upgrade completed"
```

## Data Migration

### Bulk Data Updates

```sql
-- Update existing records with new fields
UPDATE convocatorias c
SET 
    tipologia = CASE 
        WHEN c.titulo ILIKE '%subvención%' THEN 'Subvención'
        WHEN c.titulo ILIKE '%beca%' THEN 'Beca'
        WHEN c.titulo ILIKE '%premio%' THEN 'Premio'
        WHEN c.titulo ILIKE '%ayuda%' THEN 'Ayuda'
        ELSE 'Otros'
    END,
    forma_canalizacion = CASE
        WHEN c.descripcion_br ILIKE '%convocatoria%' THEN 'Convocatoria'
        WHEN c.descripcion_br ILIKE '%concesión directa%' THEN 'Concesión directa'
        ELSE 'Convocatoria'
    END
WHERE tipologia IS NULL;
```

### Data Transformation Scripts

```javascript
// scripts/transform-data.js
async function transformLegacyData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Transform organization names
    const orgs = await client.query(`
      SELECT DISTINCT codigo_organo, desc_organo 
      FROM convocatorias 
      ORDER BY codigo_organo
    `);
    
    for (const org of orgs.rows) {
      // Normalize organization names
      const normalizedName = normalizeOrgName(org.desc_organo);
      
      await client.query(`
        UPDATE convocatorias 
        SET desc_organo_normalized = $1 
        WHERE codigo_organo = $2
      `, [normalizedName, org.codigo_organo]);
    }
    
    await client.query('COMMIT');
    console.log('Data transformation completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Breaking Changes

### v1.0.0 Breaking Changes

1. **API Response Format**:
   ```typescript
   // Old format
   {
     convocatorias: [],
     total: 100
   }
   
   // New format
   {
     success: true,
     data: {
       convocatorias: [],
       pagination: {
         total: 100,
         page: 1,
         limit: 20,
         totalPages: 5
       }
     }
   }
   ```

2. **Search Parameters**:
   - `fechaDesde` replaces `startDate`
   - `fechaHasta` replaces `endDate`
   - `organoConvocante` replaces `organization`

3. **Database Schema**:
   - New required indexes
   - Updated search vector generation
   - New columns for filtering

### Migration Checklist

- [ ] Backup production database
- [ ] Test migration in staging environment
- [ ] Update API documentation
- [ ] Notify API consumers of changes
- [ ] Update monitoring alerts
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Update client applications

## Rollback Procedures

### Quick Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

BACKUP_TAG=$1

if [ -z "$BACKUP_TAG" ]; then
  echo "Usage: ./rollback.sh <backup-tag>"
  exit 1
fi

echo "Starting rollback to $BACKUP_TAG"

# 1. Stop current application
docker-compose down

# 2. Restore code
git checkout $BACKUP_TAG

# 3. Restore database
docker-compose up -d postgres
docker exec -i bdns-postgres psql -U bdns_user -d bdns_db < backups/backup_$BACKUP_TAG.sql

# 4. Rebuild and start
docker-compose up -d --build

# 5. Verify rollback
sleep 10
curl http://localhost:3000/api/health

echo "Rollback completed"
```

### Database Rollback

```sql
-- Rollback migrations
BEGIN;

-- Remove new columns
ALTER TABLE convocatorias 
  DROP COLUMN IF EXISTS tipologia,
  DROP COLUMN IF EXISTS forma_canalizacion,
  DROP COLUMN IF EXISTS procedimiento_concesion;

-- Remove from migrations table
DELETE FROM migrations 
WHERE filename IN (
  '002_add_filtering_columns.sql',
  '003_update_search_indexes.sql'
);

-- Restore old search vector
-- ... (restoration SQL)

COMMIT;
```

### Emergency Procedures

1. **Application Failure**:
   ```bash
   # Switch to maintenance mode
   docker-compose up -d maintenance
   
   # Investigate logs
   docker-compose logs --tail=100 web
   
   # Restore last known good version
   ./scripts/emergency-restore.sh
   ```

2. **Database Corruption**:
   ```bash
   # Stop application
   docker-compose stop web
   
   # Restore from backup
   ./scripts/restore-db.sh latest
   
   # Verify integrity
   docker exec bdns-postgres pg_dumpall > /dev/null
   ```

3. **Performance Degradation**:
   ```bash
   # Enable read-only mode
   docker-compose exec web npm run enable-readonly
   
   # Analyze and fix
   docker exec bdns-postgres psql -U bdns_user -d bdns_db -c "VACUUM ANALYZE;"
   
   # Scale horizontally if needed
   docker-compose up -d --scale web=3
   ```

This migration guide provides comprehensive procedures for upgrading, migrating data, handling breaking changes, and rolling back when necessary.