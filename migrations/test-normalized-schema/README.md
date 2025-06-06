# Normalized BDNS Database Schema - Test Environment

## Overview

This directory contains a complete normalized relational database design for the BDNS (Base de Datos Nacional de Subvenciones) system, following best practices for database design and performance optimization.

## Database Design Principles Applied

### 1. Normalization (1NF, 2NF, 3NF)
- **1NF**: All columns contain atomic values, no repeating groups
- **2NF**: All non-key attributes fully depend on primary keys
- **3NF**: No transitive dependencies, proper entity separation

### 2. Proper Relationships
- **1:N**: Organizations → Grants, Users → Favorites
- **N:M**: Grants ↔ Sectors, Grants ↔ Instruments, Grants ↔ Beneficiary Types
- **Hierarchical**: Organizations (self-referencing), Regions, Sectors

### 3. Data Integrity
- Primary Keys: Every table has a proper primary key
- Foreign Keys: Referential integrity enforced with CASCADE rules
- Check Constraints: Business rules enforced at database level
- Unique Constraints: Prevent data duplication

## Migration Files

Execute in order:

### 001-create-lookup-tables.sql
Creates reference/lookup tables and base data:
- `organization_levels` - Administrative hierarchy levels
- `organizations` - Government bodies with hierarchical structure
- `sectors`, `instruments`, `purposes`, `beneficiary_types` - Grant classifications
- `regions` - Geographic areas
- Sample reference data insertion

### 002-create-main-tables.sql
Creates main application tables:
- `grants` - Normalized grants table
- `grant_financing` - Budget breakdowns (1:N)
- Junction tables for N:M relationships
- Standardized user system with UUIDs
- User interaction tables with proper foreign keys

### 003-create-indexes-views.sql
Performance optimizations:
- Strategic indexes for common query patterns
- Materialized views for fast searches
- Full-text search configuration
- Statistics and analytics views
- Automatic triggers for search vectors and timestamps

### 004-data-migration-functions.sql
Data migration utilities:
- Functions to extract organizations from existing data
- Migration of JSONB classification data to normalized tables
- Sample data creation functions
- Testing and verification queries

## Key Features

### Hierarchical Organization Structure
```
ESTADO
├── MINISTERIO DE CIENCIA E INNOVACIÓN
│   ├── AGENCIA ESTATAL DE INVESTIGACIÓN
│   └── CENTRO PARA EL DESARROLLO TECNOLÓGICO
├── MINISTERIO DE INDUSTRIA
└── ...

ANDALUCÍA
├── AGENCIA ANDALUZA DE PROMOCIÓN EXTERIOR
├── INSTITUTO ANDALUZ DE TECNOLOGÍA
└── ...
```

### Grant Classification System
- **Sectors**: Economic/business categories
- **Instruments**: Types of financial aid (grants, loans, guarantees)
- **Purposes**: Grant objectives (employment, innovation, export)
- **Beneficiaries**: Who can apply (SMEs, universities, individuals)
- **Regions**: Geographic scope

### Performance Optimizations
- **Materialized Views**: Pre-computed joins for fast searches
- **GIN Indexes**: Full-text search on Spanish content
- **Composite Indexes**: Multi-column indexes for common queries
- **Partial Indexes**: Optimized for filtered queries

### Search Capabilities
- **Full-text Search**: Spanish language configuration with weights
- **Faceted Search**: Filter by organization, sector, amount, dates
- **Hierarchical Filtering**: Search by organization level
- **User Search History**: Personalized search suggestions

## Usage Instructions

### 1. Setup Test Database
```bash
# Create test database
createdb bdns_test

# Run migrations in order
psql bdns_test -f 001-create-lookup-tables.sql
psql bdns_test -f 002-create-main-tables.sql  
psql bdns_test -f 003-create-indexes-views.sql
psql bdns_test -f 004-data-migration-functions.sql
```

### 2. Migrate Existing Data (if available)
```sql
-- Extract organizations from current data
SELECT * FROM migrate_organizations_from_convocatorias();

-- Extract classifications
SELECT * FROM migrate_sectors_from_convocatorias();
SELECT * FROM migrate_instruments_from_convocatorias();
```

### 3. Create Sample Data
```sql
-- Create sample organizations and grants
SELECT create_sample_organizations();
SELECT create_sample_grants();
SELECT create_sample_users();

-- Refresh materialized views
REFRESH MATERIALIZED VIEW grant_search_view;
REFRESH MATERIALIZED VIEW organization_summary_view;
```

### 4. Test Performance
```sql
-- Test search performance
EXPLAIN ANALYZE
SELECT * FROM grant_search_view 
WHERE search_vector @@ plainto_tsquery('spanish', 'investigación')
AND total_amount > 100000
ORDER BY total_amount DESC
LIMIT 20;

-- Test hierarchical organization queries
WITH RECURSIVE org_tree AS (
    SELECT id, name, parent_id, 1 as level
    FROM organizations WHERE parent_id IS NULL
    UNION ALL
    SELECT o.id, o.name, o.parent_id, ot.level + 1
    FROM organizations o
    JOIN org_tree ot ON o.parent_id = ot.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

## Database Statistics and Monitoring

### Key Metrics Views
- `grant_statistics_view` - Overall grant statistics
- `user_engagement_view` - User activity metrics
- `organization_summary_view` - Organization performance data

### Performance Monitoring
```sql
-- Check index usage
SELECT 
    schemaname, tablename, indexname,
    idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Monitor query performance
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

## Data Integrity Verification

### Referential Integrity
```sql
-- Check for orphaned records
SELECT 'Grants without organizations' as issue, COUNT(*)
FROM grants g LEFT JOIN organizations o ON g.organization_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT 'Favorites without users', COUNT(*)
FROM user_favorites uf LEFT JOIN users u ON uf.user_id = u.id
WHERE u.id IS NULL;
```

### Constraint Validation
```sql
-- Verify constraint compliance
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
    AND constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
ORDER BY table_name, constraint_type;
```

## Migration to Production

### Phase 1: Parallel Implementation
1. Create new normalized tables alongside existing structure
2. Implement dual-write pattern in application
3. Gradually migrate data in batches
4. Validate data consistency

### Phase 2: Application Updates
1. Update ORM models to use new structure
2. Modify API endpoints to use normalized queries
3. Update search functionality to use materialized views
4. Implement new user interaction features

### Phase 3: Cutover
1. Switch application to read from new tables
2. Verify all functionality works correctly
3. Drop old tables after validation period
4. Update backup and monitoring procedures

## Benefits of Normalized Design

### Data Integrity
- Eliminates redundancy and inconsistencies
- Enforces business rules at database level
- Prevents orphaned records through foreign keys

### Performance
- Optimized indexes for common query patterns
- Materialized views for complex aggregations
- Efficient storage through normalization

### Maintainability
- Clear entity relationships
- Standardized naming conventions
- Documented constraints and relationships

### Scalability
- Proper indexing strategies
- Efficient join patterns
- Optimized for read and write operations

### Analytics
- Clean data structure for reporting
- Pre-built statistical views
- Easy data export and integration

This normalized design provides a solid foundation for the BDNS system that will scale effectively and maintain data integrity while providing excellent performance for both transactional and analytical workloads.