# BDNS API Connection Documentation

## Overview

This document details how the BDNS (Base de Datos Nacional de Subvenciones) API connection works, including authentication, data flow, endpoints, and implementation patterns used in this system.

## API Architecture

### Base Configuration

The BDNS API is Spain's official grants database API. Our system connects to:
- **Base URL**: `https://www.infosubvenciones.es/bdnstrans/`
- **Primary Endpoint**: `GE/servicios/rest/convocatorias`
- **Data Format**: JSON
- **Authentication**: None required (public API)

### Connection Implementation

#### Primary API Client (`src/lib/bdns-api-real.ts`)

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

#### Fallback Mock Client (`src/lib/bdns-api.ts`)

For development and testing when the API is unavailable:

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

### Internal API Routes

#### 1. Search API
- **URL**: `GET /api/search`
- **File**: `src/app/api/search/route.ts`
- **Purpose**: Unified search across local database and external API

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

#### 2. Budget Extraction API
- **URL**: `POST /api/extract-budgets`
- **File**: `src/app/api/extract-budgets/route.ts`
- **Purpose**: Database synchronization and migration

**Request Body**:
```json
{
  "mode": "incremental",  // "incremental" | "full" | "complete"
  "maxPages": 100,       // Optional: limit pages
  "batchSize": 50        // Optional: batch size
}
```

#### 3. Health Check API
- **URL**: `GET /api/health`
- **File**: `src/app/api/health/route.ts`
- **Purpose**: System status and database connectivity

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

## Sync Modes

### 1. Incremental Sync
- **Purpose**: Daily updates
- **Strategy**: Fetch only recent grants (last 30 days)
- **Performance**: Fast, minimal data transfer
- **Usage**: `POST /api/extract-budgets { "mode": "incremental" }`

### 2. Full Sync
- **Purpose**: Complete refresh
- **Strategy**: Fetch all available data from API
- **Performance**: Slow, complete dataset
- **Usage**: `POST /api/extract-budgets { "mode": "full" }`

### 3. Complete Migration
- **Purpose**: Fresh database setup
- **Strategy**: Drop and recreate all data
- **Performance**: Slowest, but ensures data integrity
- **Usage**: `POST /api/extract-budgets { "mode": "complete" }`

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

## Development vs Production

### Development
- Uses mock API (`bdns-api.ts`) when external API unavailable
- Smaller batch sizes for testing
- Verbose logging enabled

### Production
- Direct connection to BDNS API (`bdns-api-real.ts`)
- Optimized batch sizes (50+ records)
- Error logging and monitoring
- Automatic retry mechanisms

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

This documentation covers the complete API connection architecture. For database-specific details, see `DATABASE-STRUCTURE.md`.