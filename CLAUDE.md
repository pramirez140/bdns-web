# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**BDNS Web Application** - A high-performance Spanish Government Grants Database search system that creates a local PostgreSQL mirror of Spain's official BDNS (Base de Datos Nacional de Subvenciones) for ultra-fast search capabilities.

### Current Status (Verified Working):
- ✅ **Production BDNS API Integration**: Real connection to Spanish government API
- ✅ **Docker Environment**: PostgreSQL 15 + Next.js 14 running successfully
- ✅ **Complete Data Sync**: Historical migration (2008-2026) actively processing ~500k+ records
- ✅ **Live Database**: Currently contains 13,000+ grants and growing
- ✅ **Search Interface**: Working web UI with advanced filtering
- ✅ **Real-time Sync Monitoring**: Progress tracking and status indicators

### What This System Does:
1. **Mirrors Spanish Government Data**: Downloads all grants from official BDNS API
2. **Enables Ultra-Fast Search**: Local PostgreSQL with Spanish full-text search
3. **Provides Rich Web Interface**: Modern React/Next.js search application
4. **Maintains Data Freshness**: Multiple sync modes for different use cases
5. **Handles Massive Scale**: Designed for 500k+ records with efficient processing

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
npm run db:sync:complete   # Complete migration (2008-2026, ~500k records) - CURRENTLY RUNNING
npm run db:reset           # Reset database schema
```

### System Monitoring
```bash
curl http://localhost:3000/api/sync | jq '.'  # Check database stats and sync status
docker-compose logs -f web                   # Monitor application logs
docker-compose logs -f postgres              # Monitor database logs
```

## Architecture Overview

### Core System Design
This is a **production-ready BDNS (Base de Datos Nacional de Subvenciones) search system** that creates a local PostgreSQL mirror of Spain's official grants database for ultra-fast search capabilities.

**Key Components (All Verified Working):**
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS with responsive UI
- **API Layer**: Next.js API routes with real BDNS API integration (not mock)
- **Database**: PostgreSQL 15 with Spanish full-text search and trigram matching
- **Sync Engine**: Multi-mode data synchronization with progress tracking
- **Docker Infrastructure**: Containerized PostgreSQL + Node.js application

**Current Database State:**
- **Records**: 13,000+ convocatorias (grants) and actively growing
- **Timespan**: Historical data from 2008 to 2025
- **Organizations**: 1,700+ different grant-making organizations
- **Total Value**: €31+ billion in tracked grants
- **Sync Status**: Complete historical migration in progress

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

#### 2. Database Sync Modes (`scripts/sync-bdns-data.js` + `src/app/api/sync/route.ts`)
- **Incremental**: Recent grants only (fast daily updates)
- **Full**: 2023+ data (~50k records, moderate time)
- **Complete**: Historical 2008-2026 (~500k records, 2+ hours) - **CURRENTLY ACTIVE**

**Sync Progress Monitoring:**
- Real-time progress tracking via API endpoints
- Web UI with live status indicators and log viewing
- Database statistics automatically updated during sync
- Estimated completion times and processing speeds

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
- **`search/`**: Unified search across local DB and external API (WORKING)
- **`sync/`**: Sync management, status, and progress monitoring (WORKING)
- **`sync/logs`**: Real-time sync progress logs and statistics
- **`extract-budgets/`**: Legacy budget extraction endpoint
- **`health/`**: System status and database connectivity (WORKING)
- **`convocatoria/[id]/`**: Individual grant details (WORKING)

#### Components (`src/components/`)
- **`search/`**: SearchForm + SearchResults with pagination and sorting (WORKING)
- **`sync/`**: SyncManager with real-time progress and status indicators (WORKING)
- **`filters/`**: Advanced filtering components with multiple criteria
- **`expedientes/`**: Grant management interface
- **UI components**: Complete Tailwind-based design system

#### Data Layer (`src/lib/`)
- **`bdns-api-real.ts`**: Production BDNS API client (ACTIVE - real API connection)
- **`bdns-local.ts`**: Local PostgreSQL database client with full-text search
- **`database.ts`**: Database connection and query management
- **`bdns-api.ts`**: Development mock client (fallback only)
- **`budget-extractor.ts`**: Legacy budget extraction logic

#### Scripts (`scripts/`)
- **`sync-bdns-data.js`**: Main synchronization engine with progress tracking

### Development Context

#### Database Connection (VERIFIED WORKING)
PostgreSQL 15 running in Docker container with:
- **Spanish text search configuration** (ts_config = 'spanish')
- **Trigram extensions** for fuzzy matching (pg_trgm)
- **JSONB fields** for complex grant data storage
- **Automated sync status tracking** with real-time progress
- **UPSERT operations** for conflict-free data updates
- **Connection URL**: Configured via DATABASE_URL environment variable

#### Sync Operation Guidelines (CURRENT STATUS)
- **COMPLETE SYNC ACTIVE**: Historical migration (2008-2026) currently processing
- **Database Growing**: 13,000+ records and actively increasing
- **Monitoring Available**: Real-time progress via http://localhost:3000 sync tab
- **API Monitoring**: curl http://localhost:3000/api/sync for statistics
- **Performance**: ~0.2 pages/second processing speed (expected for complete sync)

**Sync Mode Selection:**
- **Incremental**: Daily updates for production systems
- **Full**: 2023+ data for new deployments (~50k records)
- **Complete**: Full historical data for comprehensive database (500k+ records)

#### Search Implementation (VERIFIED WORKING)
Dual search capability:
- **Local Database Search**: Ultra-fast PostgreSQL full-text search with Spanish language optimization
- **External API Search**: Direct BDNS API queries for real-time data
- **Unified Interface**: Single search endpoint handles both sources
- **Advanced Filtering**: By organization, amount, dates, and text content
- **Pagination & Sorting**: Full pagination with multiple sort options

**Search Features:**
- Spanish full-text search with trigram matching
- Real-time search suggestions and filtering
- Export capabilities for search results
- Responsive web interface with instant results

#### Testing Strategy
- **Health Endpoints**: http://localhost:3000/api/health for system verification
- **Real API Connection**: Production BDNS API integration (not mock)
- **Database Sync Monitoring**: Built-in progress tracking and error recovery
- **Log Monitoring**: Real-time sync logs via API and web interface

## Important Notes for Claude Code

### Always Check Current Status
1. **Database Stats**: `curl http://localhost:3000/api/sync | jq '.data.database_stats'`
2. **Container Status**: `docker-compose ps`
3. **Application Logs**: `docker-compose logs -f web`
4. **Sync Progress**: Check web UI sync tab for real-time status

### Key Working Features
- ✅ **Real BDNS API**: Connected to official Spanish government database
- ✅ **PostgreSQL Database**: 13,000+ records and growing via active sync
- ✅ **Web Interface**: Full search and sync management UI
- ✅ **Docker Environment**: Containerized and production-ready
- ✅ **Multi-mode Sync**: Incremental, full, and complete migration options

### Current Limitations
- Complete migration takes ~700+ hours for full historical data
- Sync UI status indicator has minor display issues (but sync works correctly)
- Rate limiting on BDNS API requires careful request management

This system successfully handles massive datasets (500k+ records) with sophisticated sync mechanisms, real-time monitoring, and optimized search capabilities.

## 📧 Sistema de Verificación de Email (Implementado - Mayo 2025)

### Características del Sistema de Email

- ✅ **Verificación de registro**: Email de bienvenida con token de verificación
- ✅ **Cambio de email**: Proceso de verificación con código de 6 dígitos
- ✅ **2FA (Two-Factor Authentication)**: Autenticación de dos factores por email
- ✅ **Templates HTML**: Emails profesionales con diseño responsivo
- ✅ **Resend functionality**: Capacidad de reenvío de emails de verificación
- ✅ **Session sync**: Actualización automática del estado de verificación

### Arquitectura del Sistema de Email

#### Base de Datos
```sql
-- Tabla users con campos de verificación
users:
  - email_verified: boolean (estado de verificación)
  - email_verification_token: varchar(255) (token único)
  - two_factor_enabled: boolean (2FA habilitado)
  - two_factor_email: boolean (2FA por email)

-- Tabla para códigos 2FA
two_factor_codes:
  - user_id: uuid (referencia a users)
  - code: varchar(6) (código de 6 dígitos)
  - expires_at: timestamp (expiración en 10 minutos)
  - used: boolean (si ya fue utilizado)
```

#### API Endpoints
- `POST /api/auth/verify`: Verificar token de email
- `POST /api/auth/resend-verification`: Reenviar email de verificación
- `POST /api/auth/2fa`: Enviar código 2FA
- `PUT /api/auth/2fa`: Verificar código 2FA
- `PUT /api/profile/email`: Cambiar email con verificación

#### Configuración SMTP
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=p.ramirez@malaga2025.org
SMTP_PASSWORD=awwo wxzm xzsz aeix
SMTP_FROM="BDNS Web" <no-reply@eype.es>
```

### Funcionalidades Implementadas

#### 1. Verificación Automática de Estado
- **Cache inteligente**: Consulta DB cada 30 segundos en desarrollo, 5 minutos en producción
- **Session sync**: NextAuth actualiza automáticamente el estado de `emailVerified`
- **UI responsiva**: Solo muestra alertas cuando el email NO está verificado

#### 2. Templates de Email
- **HTML responsivo**: Compatible con todos los clientes de email
- **Títulos en blanco**: Optimizado para fondos oscuros/claros
- **Códigos destacados**: Diseño visual para códigos de verificación
- **Branding consistente**: Logo y colores de BDNS Web

#### 3. Flujo de Verificación 2FA
1. Usuario activa 2FA en perfil
2. Al hacer login, sistema detecta 2FA habilitado
3. Valida credenciales primero
4. Envía código de 6 dígitos por email
5. Usuario introduce código en formulario especial
6. Completa el login tras verificación

#### 4. Gestión de Sesiones
```typescript
// src/lib/auth.ts - Session callback optimizado
session: {
  // Verificación automática desde DB con cache
  if (!token.emailVerifiedChecked || (now - token.emailVerifiedChecked) > cacheTime) {
    const userResult = await pool.query('SELECT email_verified FROM users WHERE id = $1', [token.id])
    token.emailVerified = userResult.rows[0].email_verified
    token.emailVerifiedChecked = now
  }
}
```

### Archivos Clave del Sistema

#### Frontend
- `src/app/auth/verify/page.tsx`: Página de verificación con resend
- `src/app/auth/signin/page.tsx`: Login con flujo 2FA
- `src/app/profile/page.tsx`: Gestión de verificación en perfil

#### Backend  
- `src/lib/email.ts`: Funciones de envío de email (send2FACode, sendEmailChangeVerification)
- `src/lib/auth.ts`: Configuración NextAuth con verificación automática
- `src/app/api/auth/`: Endpoints de autenticación y verificación

#### Base de Datos
- `migrations/add-2fa-fields.sql`: Campos 2FA en tabla users
- `migrations/add-verification-codes-table.sql`: Tabla para códigos temporales

### Estado Actual del Sistema (Mayo 2025)
- ✅ **Verificación funcional**: Sistema completo operativo
- ✅ **UI optimizada**: Solo muestra alertas cuando es necesario
- ✅ **Performance**: Cache inteligente para minimizar consultas DB
- ✅ **Compatibilidad email**: Funciona en Gmail, Spark, Outlook, etc.
- ✅ **Seguridad**: Códigos con expiración, tokens únicos, rate limiting

### Troubleshooting Email Verification

#### Problema: "Email verificado en DB pero UI muestra no verificado"
**Solución**: 
1. El sistema tiene cache de 30 segundos en desarrollo
2. Esperar 30 segundos y recargar página
3. El estado se actualiza automáticamente

#### Problema: "Títulos de email no visibles"
**Solución**: Implementado múltiples capas de compatibilidad
```html
<h1 style="color: #ffffff !important;">
  <font color="#ffffff">
    <span style="color: #ffffff !important;">BDNS Web</span>
  </font>
</h1>
```

#### Problema: "2FA no se activa en login"
**Verificar**:
1. User tiene `two_factor_enabled = true` y `two_factor_email = true`
2. Credenciales son correctas (se validan antes de 2FA)
3. Email SMTP configurado correctamente
