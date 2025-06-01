# BDNS Web API Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Search API](#search-api)
  - [Sync Management API](#sync-management-api)
  - [Organismos API](#organismos-api)
  - [Convocatoria Details API](#convocatoria-details-api)
  - [Health Check API](#health-check-api)
- [Data Models](#data-models)
- [Examples](#examples)
- [WebSocket Events](#websocket-events)

## Overview

The BDNS Web API provides programmatic access to the Spanish Government Grants Database (Base de Datos Nacional de Subvenciones). This RESTful API enables searching, filtering, and retrieving detailed information about government grants, as well as managing database synchronization.

### Key Features
- 🔍 **Full-text search** with Spanish language support
- 🏢 **Organization filtering** with historical variations
- 💰 **Financial filtering** by grant amounts
- 📅 **Date range filtering** for temporal queries
- 🔄 **Real-time sync management** with progress tracking
- 📊 **Comprehensive statistics** and analytics

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

Currently, the API is publicly accessible. Future versions will implement API key authentication for rate limiting and usage tracking.

### Cron Endpoint Authentication

The cron sync endpoint requires a secret header:

```http
X-Cron-Secret: your-cron-secret-here
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in JSON format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request parameters |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Search endpoints**: 30 requests per minute
- **Sync endpoints**: 5 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1719835200
```

## API Endpoints

### Search API

#### Search Convocatorias

Search and filter government grants with advanced options.

```http
GET /api/search
```

##### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | Search text (Spanish full-text search) | `educación` |
| `page` | number | Page number (1-based) | `1` |
| `limit` | number | Results per page (max: 100) | `20` |
| `organoConvocante` | string | Organization name filter | `Ministerio` |
| `importeMinimo` | number | Minimum grant amount | `10000` |
| `importeMaximo` | number | Maximum grant amount | `500000` |
| `fechaDesde` | string | Start date (YYYY-MM-DD) | `2024-01-01` |
| `fechaHasta` | string | End date (YYYY-MM-DD) | `2024-12-31` |
| `soloAbiertas` | boolean | Only open grants | `true` |
| `tipologia` | string | Grant typology filter | `Subvención` |
| `formaCanalizacion` | string | Distribution method | `Convocatoria` |
| `procedimientoConcesion` | string | Concession procedure | `Concurrencia competitiva` |
| `sortBy` | string | Sort field | `fecha_registro` |
| `sortOrder` | string | Sort direction (asc/desc) | `desc` |

##### Response

```json
{
  "success": true,
  "data": {
    "convocatorias": [
      {
        "id": 1234,
        "codigo_bdns": "823456",
        "titulo": "Ayudas para la investigación científica",
        "codigo_organo": "E04921001",
        "desc_organo": "Ministerio de Ciencia e Innovación",
        "fecha_registro": "2024-05-15T00:00:00.000Z",
        "fecha_inicio_solicitud": "2024-06-01T00:00:00.000Z",
        "fecha_fin_solicitud": "2024-07-31T00:00:00.000Z",
        "importe_total": 1500000.00,
        "tipologia": "Subvención",
        "finalidad": "Investigación y desarrollo",
        "descripcion_br": "Convocatoria de ayudas para proyectos de I+D+i...",
        "url_bases": "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/823456",
        "sectores": ["Investigación", "Universidad"],
        "regiones": ["Nacional"],
        "beneficiarios": {
          "tipos": ["Universidades", "Centros de investigación"],
          "descripcion": "Universidades y centros de investigación públicos y privados"
        },
        "financiacion": {
          "fuentes": ["Presupuesto Nacional"],
          "instrumentos": ["Subvención directa"]
        }
      }
    ],
    "pagination": {
      "total": 562536,
      "page": 1,
      "limit": 20,
      "totalPages": 28127,
      "hasMore": true
    },
    "stats": {
      "totalImporte": 882065753289.85,
      "avgImporte": 1800119.50,
      "totalOrganismos": 4481,
      "totalAbiertas": 29590
    }
  }
}
```

### Sync Management API

#### Get Sync Status

Retrieve current database statistics and sync status.

```http
GET /api/sync
```

##### Response

```json
{
  "success": true,
  "data": {
    "database_stats": {
      "total_convocatorias": 562536,
      "convocatorias_abiertas": 29590,
      "total_organismos": 4481,
      "importe_total_acumulado": 882065753289.85,
      "fecha_mas_antigua": "2008-10-08T00:00:00.000Z",
      "fecha_mas_reciente": "2025-05-30T00:00:00.000Z"
    },
    "latest_sync": {
      "sync_type": "incremental",
      "status": "completed",
      "started_at": "2025-05-31T00:00:01.000Z",
      "completed_at": "2025-05-31T00:05:23.000Z",
      "processed_pages": 245,
      "total_pages": 245,
      "total_records": 6125,
      "inserted_records": 87,
      "updated_records": 342,
      "duration_seconds": 322
    },
    "sync_history": [
      {
        "id": 30,
        "sync_type": "incremental",
        "status": "completed",
        "started_at": "2025-05-31T00:00:01.000Z"
      }
    ]
  }
}
```

#### Start Sync Operation

Initiate a database synchronization operation.

```http
POST /api/sync
```

##### Request Body

```json
{
  "type": "incremental" | "full" | "complete"
}
```

##### Sync Types

| Type | Description | Duration | Records |
|------|-------------|----------|---------|
| `incremental` | Last 30 days | 2-10 min | ~50-500 |
| `full` | Current year | 2-4 hours | ~50,000 |
| `complete` | All historical | 700+ hours | ~562,000 |

##### Response

```json
{
  "success": true,
  "message": "Sync process started successfully",
  "data": {
    "sync_id": 31,
    "type": "incremental",
    "status": "running",
    "started_at": "2025-05-31T10:30:00.000Z"
  }
}
```

#### Check Active Sync

Get real-time status of active sync operations.

```http
GET /api/sync/active
```

##### Response

```json
{
  "success": true,
  "data": {
    "hasActiveSync": true,
    "activeSync": {
      "id": 31,
      "sync_type": "incremental",
      "status": "running",
      "progress_percentage": 45.2,
      "processed_pages": 110,
      "total_pages": 243,
      "estimated_completion": "2025-05-31T10:35:00.000Z",
      "processing_speed": 0.8,
      "eta_minutes": 5
    }
  }
}
```

#### Cron Sync Endpoint

Endpoint for automated daily synchronization.

```http
POST /api/sync/cron
```

##### Headers

```http
X-Cron-Secret: your-cron-secret-here
Content-Type: application/json
```

##### Response

```json
{
  "success": true,
  "message": "Cron sync completed successfully",
  "data": {
    "sync_id": 32,
    "duration": 323,
    "records_processed": 6200,
    "changes": {
      "inserted": 92,
      "updated": 348
    }
  }
}
```

### Organismos API

#### List Organismos

Get all organizations that have issued grants.

```http
GET /api/organismos
```

##### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search organization names | `ministerio` |
| `tipo` | string | Organization type filter | `estado` |
| `limit` | number | Results per page | `50` |
| `offset` | number | Skip records | `0` |

##### Response

```json
{
  "success": true,
  "data": {
    "organismos": [
      {
        "codigo_organo": "E04921001",
        "desc_organo": "Ministerio de Ciencia e Innovación",
        "total_convocatorias": 1523,
        "importe_total": 3450000000.00,
        "fecha_primera": "2008-10-15T00:00:00.000Z",
        "fecha_ultima": "2025-05-30T00:00:00.000Z",
        "activo": true
      }
    ],
    "total": 4481
  }
}
```

#### Get Organismo Variations

Get historical name variations for an organization.

```http
GET /api/organismos/variaciones
```

##### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `codigo` | string | Organization code | `E04921001` |

##### Response

```json
{
  "success": true,
  "data": {
    "codigo_organo": "E04921001",
    "variaciones": [
      {
        "desc_organo": "Ministerio de Ciencia e Innovación",
        "primera_aparicion": "2020-01-15T00:00:00.000Z",
        "ultima_aparicion": "2025-05-30T00:00:00.000Z",
        "total_convocatorias": 523
      },
      {
        "desc_organo": "Ministerio de Ciencia, Innovación y Universidades",
        "primera_aparicion": "2018-06-07T00:00:00.000Z",
        "ultima_aparicion": "2020-01-14T00:00:00.000Z",
        "total_convocatorias": 412
      }
    ],
    "total_variaciones": 2
  }
}
```

### Convocatoria Details API

#### Get Convocatoria by ID

Retrieve detailed information about a specific grant.

```http
GET /api/convocatoria/{id}
```

##### Path Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `id` | string | BDNS code | `823456` |

##### Response

```json
{
  "success": true,
  "data": {
    "convocatoria": {
      "id": 1234,
      "codigo_bdns": "823456",
      "titulo": "Ayudas para la investigación científica",
      "descripcion_completa": "Detailed description...",
      "requisitos": {
        "generales": ["Requirement 1", "Requirement 2"],
        "especificos": ["Specific requirement 1"],
        "documentacion": ["Document 1", "Document 2"]
      },
      "proceso_solicitud": {
        "pasos": ["Step 1", "Step 2"],
        "plataforma": "Sede electrónica",
        "url_solicitud": "https://sede.example.com/solicitud"
      },
      "criterios_evaluacion": [
        {
          "criterio": "Calidad científica",
          "peso": 40
        },
        {
          "criterio": "Impacto social",
          "peso": 30
        }
      ],
      "contacto": {
        "email": "ayudas@ciencia.gob.es",
        "telefono": "+34 91 123 4567",
        "direccion": "C/ Example, 123, Madrid"
      },
      "documentos_relacionados": [
        {
          "tipo": "Bases reguladoras",
          "url": "https://example.com/bases.pdf"
        }
      ],
      "historial_cambios": [
        {
          "fecha": "2024-05-20T00:00:00.000Z",
          "tipo": "Ampliación plazo",
          "descripcion": "Se amplía el plazo hasta el 15 de agosto"
        }
      ]
    }
  }
}
```

### Health Check API

#### System Health Check

Check if the API and database are operational.

```http
GET /api/health
```

##### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-05-31T10:30:00.000Z",
  "services": {
    "database": "connected",
    "bdns_api": "reachable",
    "cache": "operational"
  },
  "version": "1.0.0"
}
```

## Data Models

### Convocatoria Model

```typescript
interface Convocatoria {
  id: number;
  codigo_bdns: string;
  titulo: string;
  codigo_organo: string;
  desc_organo: string;
  fecha_registro: Date;
  fecha_inicio_solicitud?: Date;
  fecha_fin_solicitud?: Date;
  fecha_inicio_ejecucion?: Date;
  fecha_fin_ejecucion?: Date;
  importe_total?: number;
  tipologia?: string;
  tipo_beneficiario?: string;
  finalidad?: string;
  formas_financiacion?: string;
  descripcion_br?: string;
  descripcion_lg?: string;
  forma_canalizacion?: string;
  procedimiento_concesion?: string;
  url_bases?: string;
  se_financia_fondos_ue?: boolean;
  sectores?: string[];
  regiones?: string[];
  beneficiarios?: {
    tipos: string[];
    descripcion?: string;
  };
  financiacion?: {
    fuentes: string[];
    instrumentos: string[];
    presupuesto_desglose?: Record<string, number>;
  };
  created_at: Date;
  updated_at: Date;
}
```

### Pagination Model

```typescript
interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}
```

### Search Filters Model

```typescript
interface SearchFilters {
  query?: string;
  organoConvocante?: string;
  importeMinimo?: number;
  importeMaximo?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  soloAbiertas?: boolean;
  tipologia?: string;
  formaCanalizacion?: string;
  procedimientoConcesion?: string;
  tipoEntidad?: string;
  ambito?: string;
  finalidad?: string;
  sectores?: string[];
  regiones?: string[];
}
```

## Examples

### Search for Education Grants

```bash
curl -X GET "https://api.example.com/api/search?query=educación&limit=10&soloAbiertas=true" \
  -H "Accept: application/json"
```

### Filter by Organization and Amount

```bash
curl -X GET "https://api.example.com/api/search?organoConvocante=Ministerio%20de%20Educación&importeMinimo=50000&importeMaximo=200000" \
  -H "Accept: application/json"
```

### Start Incremental Sync

```bash
curl -X POST "https://api.example.com/api/sync" \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'
```

### Get Organization Variations

```bash
curl -X GET "https://api.example.com/api/organismos/variaciones?codigo=E04921001" \
  -H "Accept: application/json"
```

### JavaScript/TypeScript Example

```typescript
// Search for grants
async function searchGrants(query: string, filters?: SearchFilters) {
  const params = new URLSearchParams({
    query,
    limit: '20',
    ...filters
  });

  const response = await fetch(`/api/search?${params}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data.data;
}

// Get grant details
async function getGrantDetails(codigoBdns: string) {
  const response = await fetch(`/api/convocatoria/${codigoBdns}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data.data.convocatoria;
}

// Monitor sync progress
async function monitorSync() {
  const response = await fetch('/api/sync/active');
  const data = await response.json();
  
  if (data.data.hasActiveSync) {
    console.log(`Sync progress: ${data.data.activeSync.progress_percentage}%`);
    console.log(`ETA: ${data.data.activeSync.eta_minutes} minutes`);
  }
}
```

### Python Example

```python
import requests
from typing import Optional, Dict, Any

class BDNSClient:
    def __init__(self, base_url: str = "https://api.example.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
    
    def search_grants(self, query: str, **filters) -> Dict[str, Any]:
        """Search for grants with optional filters"""
        params = {'query': query, **filters}
        response = self.session.get(f"{self.base_url}/search", params=params)
        response.raise_for_status()
        return response.json()
    
    def get_grant_details(self, codigo_bdns: str) -> Dict[str, Any]:
        """Get detailed information about a specific grant"""
        response = self.session.get(f"{self.base_url}/convocatoria/{codigo_bdns}")
        response.raise_for_status()
        return response.json()
    
    def start_sync(self, sync_type: str = "incremental") -> Dict[str, Any]:
        """Start a synchronization process"""
        response = self.session.post(
            f"{self.base_url}/sync",
            json={"type": sync_type}
        )
        response.raise_for_status()
        return response.json()

# Usage example
client = BDNSClient()

# Search for education grants
results = client.search_grants(
    "educación",
    soloAbiertas=True,
    importeMinimo=10000,
    limit=20
)

for grant in results['data']['convocatorias']:
    print(f"{grant['titulo']} - €{grant['importe_total']:,.2f}")
```

## WebSocket Events (Future Implementation)

Future versions will support real-time updates via WebSocket connections:

### Connection

```javascript
const ws = new WebSocket('wss://api.example.com/ws');

ws.on('connect', () => {
  // Subscribe to sync updates
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'sync-progress'
  }));
});
```

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `sync:started` | Sync operation started | `{syncId, type, totalPages}` |
| `sync:progress` | Sync progress update | `{syncId, progress, processedPages}` |
| `sync:completed` | Sync operation completed | `{syncId, duration, stats}` |
| `grant:new` | New grant added | `{convocatoria}` |
| `grant:updated` | Grant updated | `{convocatoria, changes}` |

## Best Practices

1. **Pagination**: Always use pagination for large result sets
2. **Caching**: Implement client-side caching for frequently accessed data
3. **Error Handling**: Always check the `success` field in responses
4. **Rate Limiting**: Respect rate limits to avoid being throttled
5. **Date Formats**: Use ISO 8601 date format (YYYY-MM-DD)
6. **Amount Values**: Amounts are in euros with 2 decimal places
7. **Character Encoding**: Use UTF-8 for Spanish characters

## Support

For API support, feature requests, or bug reports:
- GitHub Issues: [https://github.com/your-username/bdns-web/issues](https://github.com/your-username/bdns-web/issues)
- Email: support@example.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Full-text search with Spanish support
- Organization filtering with variations
- Advanced filtering options
- Sync management endpoints
- Real-time progress tracking