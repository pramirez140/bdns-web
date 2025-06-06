import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, organismos, region, limit = 100, format = 'csv' } = body;

    // Validate format - only CSV for now
    if (!['csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Only CSV is supported currently' },
        { status: 400 }
      );
    }

    // Validate limit
    const exportLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);

    console.log(`🔄 Exporting search results: query="${query}", limit=${exportLimit}, format=${format}`);

    // Use direct database query for export
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
    });
    
    // Build search query
    let searchQuery = `
      SELECT 
        codigo_bdns,
        titulo,
        desc_organo,
        fecha_registro,
        inicio_solicitud,
        fin_solicitud,
        abierto,
        importe_total,
        importe_maximo_beneficiario,
        region,
        finalidad,
        instrumento,
        sector,
        tipo_beneficiario,
        fondo_ue,
        permalink_convocatoria,
        permalink_concesiones
      FROM convocatorias 
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    // Add search filters
    if (query) {
      searchQuery += ` AND (
        titulo ILIKE $${paramIndex} OR 
        desc_organo ILIKE $${paramIndex} OR
        search_vector @@ plainto_tsquery('spanish', $${paramIndex})
      )`;
      queryParams.push(`%${query}%`);
      paramIndex++;
    }

    searchQuery += ` ORDER BY fecha_registro DESC LIMIT $${paramIndex}`;
    queryParams.push(exportLimit);

    const result = await pool.query(searchQuery, queryParams);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No results found for export' },
        { status: 404 }
      );
    }

    // Prepare data for export - flatten complex fields
    const exportData = result.rows.map((item, index) => ({
      'Nº': index + 1,
      'Código BDNS': item.codigo_bdns,
      'Título': item.titulo,
      'Organismo': item.desc_organo,
      'Fecha Registro': item.fecha_registro ? new Date(item.fecha_registro).toLocaleDateString('es-ES') : '',
      'Fecha Inicio Solicitud': item.inicio_solicitud ? new Date(item.inicio_solicitud).toLocaleDateString('es-ES') : '',
      'Fecha Fin Solicitud': item.fin_solicitud ? new Date(item.fin_solicitud).toLocaleDateString('es-ES') : '',
      'Estado': item.abierto ? 'Abierto' : 'Cerrado',
      'Importe Total': item.importe_total || '',
      'Importe Máximo Beneficiario': item.importe_maximo_beneficiario || '',
      'Regiones': Array.isArray(item.region) ? item.region.join(', ') : (item.region || ''),
      'Finalidad': item.finalidad ? (typeof item.finalidad === 'object' ? item.finalidad.descripcion : item.finalidad) : '',
      'Instrumento': item.instrumento ? (Array.isArray(item.instrumento) 
        ? item.instrumento.map(i => (typeof i === 'object' ? i.descripcion : i)).join(', ') 
        : (typeof item.instrumento === 'object' ? item.instrumento.descripcion : item.instrumento)) : '',
      'Sector': item.sector ? (Array.isArray(item.sector) 
        ? item.sector.map(s => (typeof s === 'object' ? s.descripcion : s)).join(', ') 
        : (typeof item.sector === 'object' ? item.sector.descripcion : item.sector)) : '',
      'Tipo Beneficiario': item.tipo_beneficiario ? (Array.isArray(item.tipo_beneficiario) 
        ? item.tipo_beneficiario.map(t => (typeof t === 'object' ? t.descripcion : t)).join(', ') 
        : (typeof item.tipo_beneficiario === 'object' ? item.tipo_beneficiario.descripcion : item.tipo_beneficiario)) : '',
      'Fondo UE': item.fondo_ue || '',
      'URL Convocatoria': item.permalink_convocatoria || '',
      'URL Concesiones': item.permalink_concesiones || ''
    }));

    console.log(`✅ Prepared ${exportData.length} records for export`);

    // Generate CSV file manually
    const headers = Object.keys(exportData[0] || {});
    const csvRows = [
      headers.join(','), // Header row
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `convocatorias_${timestamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(csv, 'utf8').toString(),
      },
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}