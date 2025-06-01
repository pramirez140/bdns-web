# Database Scripts

This directory contains database analysis and utility scripts for the BDNS Web application.

## Scripts

### Analysis Scripts
- **`analyze-change-patterns.sql`** - SQL queries to analyze data change patterns
- **`database-migration-change-detection.sql`** - Change detection for database migrations

## Usage

### Change Pattern Analysis
```bash
# Connect to PostgreSQL and run analysis
psql $DATABASE_URL -f scripts/database/analyze-change-patterns.sql
```

### Migration Change Detection
```bash
# Run change detection queries
psql $DATABASE_URL -f scripts/database/database-migration-change-detection.sql
```

## Database Connection

Scripts expect a PostgreSQL connection via:
- `DATABASE_URL` environment variable
- Direct psql connection to the BDNS database

## Analysis Features

- Change pattern identification in BDNS data
- Migration impact assessment
- Data consistency checks
- Performance analysis queries

## Security Notes

- Scripts are read-only analysis queries
- No data modification operations
- Safe to run on production databases