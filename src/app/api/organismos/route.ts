import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = Database.getInstance();
    
    // Get organism names with normalization to group similar entities
    const query = `
      WITH normalized_organismos AS (
        SELECT 
          desc_organo as nombre_completo,
          CASE 
            -- Normalize main government ministries
            WHEN desc_organo ILIKE '%MINISTERIO DE TRABAJO Y ECONOMÍA SOCIAL%' THEN 'ESTADO - MINISTERIO DE TRABAJO Y ECONOMÍA SOCIAL'
            WHEN desc_organo ILIKE '%MINISTERIO DE HACIENDA%' THEN 'ESTADO - MINISTERIO DE HACIENDA'
            WHEN desc_organo ILIKE '%MINISTERIO DE ECONOMÍA%' THEN 'ESTADO - MINISTERIO DE ECONOMÍA, COMERCIO Y EMPRESA'
            WHEN desc_organo ILIKE '%MINISTERIO DE CIENCIA%' THEN 'ESTADO - MINISTERIO DE CIENCIA E INNOVACIÓN'
            WHEN desc_organo ILIKE '%MINISTERIO DE INDUSTRIA%' THEN 'ESTADO - MINISTERIO DE INDUSTRIA, COMERCIO Y TURISMO'
            WHEN desc_organo ILIKE '%MINISTERIO DE AGRICULTURA%' THEN 'ESTADO - MINISTERIO DE AGRICULTURA, PESCA Y ALIMENTACIÓN'
            WHEN desc_organo ILIKE '%MINISTERIO DE CULTURA%' THEN 'ESTADO - MINISTERIO DE CULTURA Y DEPORTE'
            WHEN desc_organo ILIKE '%MINISTERIO DE SANIDAD%' THEN 'ESTADO - MINISTERIO DE SANIDAD'
            WHEN desc_organo ILIKE '%MINISTERIO DE EDUCACIÓN%' THEN 'ESTADO - MINISTERIO DE EDUCACIÓN Y FORMACIÓN PROFESIONAL'
            -- Normalize autonomous communities (keep the main entity)
            WHEN desc_organo ILIKE 'ANDALUCÍA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'CATALUNYA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'COMUNIDAD DE MADRID -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'COMUNITAT VALENCIANA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'GALICIA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'CASTILLA Y LEÓN -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'PAÍS VASCO -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'CANARIAS -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'CASTILLA-LA MANCHA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'MURCIA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'ARAGÓN -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'EXTREMADURA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'ILLES BALEARS -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'LA RIOJA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'CANTABRIA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'NAVARRA -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            WHEN desc_organo ILIKE 'ASTURIAS -%' THEN REGEXP_REPLACE(desc_organo, ' - .*', '')
            -- Keep others as is for now
            ELSE desc_organo
          END as nombre_normalizado,
          1 as count_convocatorias
        FROM convocatorias 
        WHERE desc_organo IS NOT NULL 
          AND desc_organo != ''
          AND desc_organo != 'NULL'
      )
      SELECT 
        nombre_normalizado as nombre,
        SUM(count_convocatorias) as total_convocatorias,
        STRING_AGG(DISTINCT nombre_completo, ' | ') as variaciones
      FROM normalized_organismos 
      GROUP BY nombre_normalizado 
      HAVING SUM(count_convocatorias) >= 5
      ORDER BY total_convocatorias DESC, nombre_normalizado ASC
      LIMIT 100
    `;
    
    const result = await db.query(query);
    
    const organismos = result.rows.map((row: any) => ({
      nombre: row.nombre,
      totalConvocatorias: parseInt(row.total_convocatorias),
      variaciones: row.variaciones ? row.variaciones.split(' | ') : [row.nombre]
    }));
    
    return NextResponse.json({
      success: true,
      data: organismos
    });
    
  } catch (error: any) {
    console.error('💥 Error fetching organismos:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch organismos',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}