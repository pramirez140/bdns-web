# BDNS API Connection Documentation

## Overview

This document details how the BDNS (Base de Datos Nacional de Subvenciones) API connection works in our **production system**, including authentication, data flow, endpoints, and implementation patterns.

### Current System Status (Verified Working - May 31, 2025)
- ✅ **Live BDNS API Connection**: Real connection to Spanish government API
- ✅ **Complete Database**: 562,536 grants fully stored (historical migration COMPLETED)
- ✅ **Working Endpoints**: All API routes tested and functional
- ✅ **Historical Migration**: ✅ COMPLETED (May 30, 2025)
- ✅ **Data Integrity**: €882+ billion in tracked grants across 4,481+ organizations

## API Architecture

### Base Configuration (Production System)

The BDNS API is Spain's official grants database API. Our system connects to:
- **Base URL**: `https://www.infosubvenciones.es/bdnstrans/`
- **Primary Endpoint**: `GE/servicios/rest/convocatorias`
- **Data Format**: JSON
- **Authentication**: None required (public API)
- **Current Status**: ✅ **ACTIVE CONNECTION** - Successfully processing historical data
- **Rate Limit**: ~0.2 pages/second for sustainable sync operations

### Connection Implementation

#### Primary API Client (`src/lib/bdns-api-real.ts`) - **CURRENTLY ACTIVE**

```typescript
const BDNS_BASE_URL = 'https://www.infosubvenciones.es/bdnstrans/GE/servicios/rest/convocatorias';

export async function fetchConvocatorias(params: BDNSApiParams): Promise<BDNSApiResponse> {
  const queryParams = new URLSearchParams({
    numPag: params.page?.toString() || '1',
    tamPag: params.pageSize?.toString() || '25',
    ...(params.text && { texto: params.text }),
    ...(params.organo && { organo: params.organo }),
    ...(params.fechaDesde && { fechaDesde: params.fechaDesde }),
    ...(params.fechaHasta && { fechaHasta: params.fechaHasta })
  });

  const response = await fetch(`${BDNS_BASE_URL}?${queryParams}`);
  return response.json();
}
```

#### Fallback Mock Client (`src/lib/bdns-api.ts`) - **NOT USED IN PRODUCTION**

For development and testing when the API is unavailable (currently our system uses real API):

```typescript
export async function fetchConvocatorias(params: BDNSApiParams): Promise<BDNSApiResponse> {
  // Simulates API delays and responses
  await new Promise(resolve => setTimeout(resolve, 1000));
  return generateMockData(params);
}
```

## Data Flow Architecture

### 1. Request Flow

```
Frontend → Next.js API Route → BDNS API Client → External BDNS API
   ↓              ↓                    ↓              ↓
Search UI → /api/search → bdns-api-real.ts → infosubvenciones.es
```

### 2. Response Flow

```
External API → API Client → Database (sync) → Frontend
     ↓             ↓            ↓              ↓
JSON Response → Transform → PostgreSQL → Search Results
```

### 3. Sync Flow

```
Sync Command → Migration Service → Batch Processing → Database Storage
     ↓               ↓                    ↓              ↓
npm run sync → extract-budgets → Paginated Fetch → PostgreSQL UPSERT
```

## API Endpoints

### External BDNS API

#### 1. Convocatorias Search
- **URL**: `GET /convocatorias`
- **Parameters**:
  - `numPag`: Page number (1-based)
  - `tamPag`: Page size (1-50)
  - `texto`: Search text
  - `organo`: Organization filter
  - `fechaDesde`: Start date (YYYY-MM-DD)
  - `fechaHasta`: End date (YYYY-MM-DD)

**Example Request**:
```bash
curl "https://www.infosubvenciones.es/bdnstrans/GE/servicios/rest/convocatorias?numPag=1&tamPag=25&texto=investigacion"
```

**Response Structure**:
```json
{
  "numPag": 1,
  "tamPag": 25,
  "totalPag": 150,
  "totalSubvenciones": 3750,
  "resultado": [
    {
      "titulo": "Grant title",
      "codigo": "GRANT-001",
      "organo": "Ministry of Science",
      "fechaPublicacion": "2024-01-15",
      "fechaInicioSolicitud": "2024-02-01",
      "fechaFinSolicitud": "2024-03-01",
      "presupuesto": "500000.00",
      "descripcion": "Grant description..."
    }
  ]
}
```

### Internal API Routes (All Verified Working)

#### 1. Search API ✅ **WORKING**
- **URL**: `GET /api/search`
- **File**: `src/app/api/search/route.ts`
- **Purpose**: Unified search across local database and external API
- **Current Data**: 20,533+ searchable grants

**Parameters**:
```typescript
interface SearchParams {
  q?: string;           // Search query
  page?: number;        // Page number
  limit?: number;       // Results per page
  organo?: string;      // Organization filter
  dateFrom?: string;    // Start date
  dateTo?: string;      // End date
  source?: 'local' | 'api'; // Data source
}
```

#### 2. Sync Management API ✅ **WORKING**
- **URL**: `POST /api/sync`
- **File**: `src/app/api/sync/route.ts`
- **Purpose**: Database synchronization and migration management
- **Current Status**: Complete migration actively processing

**Request Body**:
```json
{
  "type": "complete"  // "incremental" | "full" | "complete"
}
```

**Example - Start Complete Migration** (Currently Running):
```bash
curl -X POST "http://localhost:3000/api/sync" \
  -H "Content-Type: application/json" \
  -d '{"type": "complete"}'
```

#### 3. Health Check API ✅ **WORKING**
- **URL**: `GET /api/health`
- **File**: `src/app/api/health/route.ts`
- **Purpose**: System status and database connectivity
- **Current Response**: All systems healthy

#### 4. Sync Statistics API ✅ **WORKING**
- **URL**: `GET /api/sync`
- **File**: `src/app/api/sync/route.ts`
- **Purpose**: Real-time database statistics and sync status
- **Live Data**: Returns current grant count, organizations, financial totals

## Connection Patterns

### 1. Error Handling

```typescript
export async function fetchConvocatorias(params: BDNSApiParams): Promise<BDNSApiResponse> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`BDNS API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('BDNS API connection failed:', error);
    throw new Error('Failed to connect to BDNS API');
  }
}
```

### 2. Rate Limiting

```typescript
// Implemented in budget extraction
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

for (let page = 1; page <= totalPages; page++) {
  const data = await fetchConvocatorias({ page, pageSize: 50 });
  await processBatch(data.resultado);
  
  // Rate limiting: 1 request per second
  await delay(1000);
}
```

### 3. Data Transformation

```typescript
// Transform BDNS API data to database schema
function transformConvocatoria(item: any): DatabaseRecord {
  return {
    codigo: item.codigo,
    titulo: item.titulo,
    organo: item.organo,
    fecha_publicacion: new Date(item.fechaPublicacion),
    fecha_inicio_solicitud: item.fechaInicioSolicitud ? new Date(item.fechaInicioSolicitud) : null,
    fecha_fin_solicitud: item.fechaFinSolicitud ? new Date(item.fechaFinSolicitud) : null,
    presupuesto: parseFloat(item.presupuesto) || null,
    descripcion: item.descripcion,
    full_text_search: generateSearchVector(item)
  };
}
```

## Database Integration

### 1. UPSERT Operations

```sql
INSERT INTO convocatorias (codigo, titulo, organo, fecha_publicacion, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (codigo) 
DO UPDATE SET
  titulo = EXCLUDED.titulo,
  organo = EXCLUDED.organo,
  fecha_publicacion = EXCLUDED.fecha_publicacion,
  updated_at = CURRENT_TIMESTAMP;
```

### 2. Full-Text Search

```sql
-- Search with Spanish language support
SELECT * FROM convocatorias 
WHERE full_text_search @@ plainto_tsquery('spanish', $1)
ORDER BY ts_rank(full_text_search, plainto_tsquery('spanish', $1)) DESC;
```

## Sync Modes (Current System Implementation)

### 1. Incremental Sync ✅ Available
- **Purpose**: Daily updates
- **Strategy**: Fetch only recent grants (last 30 days)
- **Performance**: Fast, minimal data transfer
- **Usage**: `POST /api/sync { "type": "incremental" }`
- **Command**: `npm run db:sync`

### 2. Full Sync ✅ Available
- **Purpose**: Complete refresh (2023+ data)
- **Strategy**: Fetch ~50k recent grants
- **Performance**: Moderate, 2-4 hours
- **Usage**: `POST /api/sync { "type": "full" }`
- **Command**: `npm run db:sync:full`

### 3. Complete Migration ✅ **COMPLETED**
- **Purpose**: All historical data (2008-2025)
- **Strategy**: Fetch all 562k+ grants from BDNS history
- **Performance**: Historical migration completed successfully
- **Usage**: `POST /api/sync { "type": "complete" }`
- **Command**: `npm run db:sync:complete`
- **Status**: ✅ **COMPLETED** - 562,536 grants successfully migrated

## Connection Monitoring

### 1. Health Checks

```typescript
// Check API connectivity
export async function checkBDNSConnection(): Promise<boolean> {
  try {
    const response = await fetch(BDNS_BASE_URL + '?numPag=1&tamPag=1');
    return response.ok;
  } catch {
    return false;
  }
}
```

### 2. Sync Logging

```typescript
// Track sync progress
console.log(`[SYNC] Processing page ${page}/${totalPages}`);
console.log(`[SYNC] Processed ${processedRecords} records`);
console.log(`[SYNC] ${inserted} inserted, ${updated} updated`);
```

## Error Scenarios

### 1. API Unavailable
- **Fallback**: Use local database for searches
- **Response**: Return cached data with timestamp
- **Logging**: Log connection failures for monitoring

### 2. Rate Limiting
- **Detection**: HTTP 429 responses
- **Handling**: Exponential backoff retry
- **Recovery**: Resume from last successful page

### 3. Data Corruption
- **Detection**: Schema validation on API responses
- **Handling**: Skip invalid records, log errors
- **Recovery**: Manual review of failed records

## Performance Optimization

### 1. Batch Processing
- Process records in batches of 50-100
- Use database transactions for consistency
- Implement progress tracking

### 2. Connection Pooling
- Reuse HTTP connections
- Implement connection timeouts
- Use persistent connections where possible

### 3. Caching Strategy
- Cache API responses for 1 hour
- Use database for primary searches
- Implement cache invalidation on sync

## Current System Status

### Production Environment ✅ **FULLY OPERATIONAL**
- **API Connection**: Direct connection to BDNS API (`bdns-api-real.ts`)
- **Database**: PostgreSQL with 562,536 grants (historical migration completed)
- **Performance**: Optimized batch processing with progress tracking
- **Monitoring**: Real-time sync logs and statistics
- **Error Handling**: Automatic retry mechanisms and recovery

**Live Statistics** (Updated May 31, 2025):
```bash
curl http://localhost:3000/api/sync | jq '.data.database_stats'
# Returns:
# {
#   "total_convocatorias": 562536,
#   "convocatorias_abiertas": 29590,
#   "total_organismos": 4481,
#   "importe_total_acumulado": 882065753289.85
# }
```

### Development Environment
- **Fallback Available**: Mock API (`bdns-api.ts`) for testing
- **Local Testing**: All endpoints available for development
- **Debug Mode**: Verbose logging and error details

## Security Considerations

### 1. Data Validation
- Validate all API responses
- Sanitize user inputs
- Use parameterized SQL queries

### 2. Error Handling
- Don't expose internal errors to users
- Log security-related events
- Implement request timeouts

### 3. Rate Limiting
- Respect external API limits
- Implement internal rate limiting
- Monitor usage patterns

## Real-time Monitoring Examples

**Check Current Database Status**:
```bash
# Get current statistics
curl http://localhost:3000/api/sync | jq '.data.database_stats.total_convocatorias'
# Output: 562536 (completed migration)

# Check system health
curl http://localhost:3000/api/health
# Returns: {"status": "healthy"}

# Test search functionality
curl "http://localhost:3000/api/search?query=empleo" | jq '.data.total'
# Returns matching grants from 562k+ database
```

**Access Live Web Interface**:
- **Main Application**: http://localhost:3000
- **Search Interface**: Click "🔍 Buscar Subvenciones" tab
- **Sync Management**: Click "🔄 Gestión de Datos" tab
- **Real-time Stats**: View growing database statistics

This documentation covers the complete API connection architecture for our **production system**. For database-specific details, see `DATABASE-STRUCTURE.md`.