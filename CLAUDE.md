# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
```bash
npm run dev                 # Start Next.js development server
npm run build              # Production build
npm run lint               # ESLint checking  
npm run type-check         # TypeScript validation
```

### Docker Operations
```bash
npm run docker:dev         # Docker Compose development mode
docker-compose up -d       # Start PostgreSQL and services
docker-compose logs -f     # View container logs
```

### Database Synchronization
```bash
npm run db:sync            # Incremental sync (recent grants)
npm run db:sync:full       # Full sync (2023+ data, ~50k records)
npm run db:sync:complete   # Complete migration (2008-2026, ~500k records)
npm run db:reset           # Reset database schema
```

## Architecture Overview

### Core System Design
This is a **BDNS (Spanish Government Grants Database) search system** that creates a local PostgreSQL mirror of Spain's official grants database for ultra-fast search capabilities.

**Key Components:**
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **API Layer**: Next.js API routes with BDNS API integration
- **Database**: PostgreSQL 15 with Spanish full-text search
- **Sync Engine**: Multi-mode data synchronization (incremental/full/complete)

### Data Flow Architecture
```
External BDNS API → Sync Engine → PostgreSQL → Search API → Frontend
                      ↓
                 Progress Tracking & Logging
```

### Critical Patterns

#### 1. BDNS API Integration (`src/lib/bdns-api-real.ts`)
- **Primary**: Real BDNS API client with rate limiting
- **Fallback**: Mock API client (`src/lib/bdns-api.ts`) for development
- **Error Handling**: Automatic fallback and retry mechanisms

#### 2. Database Sync Modes (`src/app/api/extract-budgets/route.ts`)
- **Incremental**: Recent grants only (fast daily updates)
- **Full**: 2023+ data (~50k records, moderate time)
- **Complete**: Historical 2008-2026 (~500k records, 2+ hours)

#### 3. PostgreSQL Optimization
- **Full-text Search**: Spanish language configuration with trigram matching
- **UPSERT Operations**: Conflict resolution on `codigo` field
- **Batch Processing**: Atomic transactions with progress tracking

#### 4. Type Safety (`src/types/bdns.ts`)
- Comprehensive TypeScript interfaces for all BDNS data structures
- API response types with pagination metadata
- Database record types with search vectors

### Directory Structure Significance

#### API Routes (`src/app/api/`)
- **`search/`**: Unified search across local DB and external API
- **`extract-budgets/`**: Core sync engine with batch processing
- **`health/`**: System status and database connectivity
- **`convocatoria/[id]/`**: Individual grant details

#### Components (`src/components/`)
- **`search/`**: SearchForm + SearchResults with real-time updates
- **`expedientes/`**: Grant management interface
- **`filters/`**: Advanced filtering components
- **UI components**: Tailwind-based design system

#### Data Layer (`src/lib/`)
- **`bdns-api-real.ts`**: Production BDNS API client
- **`bdns-api.ts`**: Development mock client
- **`budget-extractor.ts`**: Sync engine core logic

### Development Context

#### Database Connection
Always use the PostgreSQL connection via Docker. The database includes:
- **Spanish text search configuration**
- **Trigram extensions for fuzzy matching**
- **JSONB fields for complex grant data**
- **Automated sync status tracking**

#### Sync Operation Guidelines
- Start with incremental sync for development
- Use full sync for production deployment
- Complete sync only for fresh installations
- Monitor sync progress via API logs

#### Search Implementation
The system provides both local database search (fast) and external API search (comprehensive). Local search uses PostgreSQL full-text search with Spanish language optimization.

#### Testing Strategy
- Mock API available for development when external API is unavailable
- Health check endpoint for system verification
- Database sync includes built-in progress monitoring and error recovery

This system handles massive datasets (500k+ records) with sophisticated sync mechanisms and optimized search capabilities.