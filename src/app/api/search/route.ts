import { NextRequest, NextResponse } from 'next/server';
import { bdnsLocalClient } from '@/lib/bdns-local';
import { SearchFilters, SearchParams } from '@/types/bdns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    
    // Extract search parameters
    const query = searchParams.get('query') || searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || undefined;
    
    // Extract filters
    const organoConvocante = searchParams.get('organoConvocante') || searchParams.get('organo');
    const organoConvocanteArray = organoConvocante ? (organoConvocante.includes(',') ? organoConvocante.split(',').filter(Boolean) : [organoConvocante]) : undefined;
    const importeMinimo = searchParams.get('importeMinimo') ? parseFloat(searchParams.get('importeMinimo')!) : undefined;
    const importeMaximo = searchParams.get('importeMaximo') ? parseFloat(searchParams.get('importeMaximo')!) : undefined;
    const fechaDesde = searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined;
    const fechaHasta = searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined;
    const estadoConvocatoria = searchParams.get('estadoConvocatoria') || undefined;
    
    // Build filters object
    const filtros: SearchFilters = {
      query,
      organoConvocante: organoConvocanteArray,
      importeMinimo,
      importeMaximo,
      fechaConvocatoria: (fechaDesde || fechaHasta) ? {
        desde: fechaDesde,
        hasta: fechaHasta
      } : undefined,
      estadoConvocatoria
    };

    // Build search params object
    const searchConfig: SearchParams = {
      page,
      pageSize,
      sortBy,
      sortOrder
    };

    console.log('🔍 API Search request (local database):', { filtros, searchConfig });
    console.log('📝 Session user:', session?.user?.id ? `User ${session.user.id}` : 'No session');

    // Perform search using local database
    const results = await bdnsLocalClient.buscarConvocatorias(filtros, searchConfig);

    // Save search history for logged-in users
    if (session?.user?.id && query) {
      try {
        await pool.query(`
          INSERT INTO search_history (user_id, query, filters, result_count)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, LOWER(query)) WHERE user_id IS NOT NULL
          DO UPDATE SET 
            result_count = EXCLUDED.result_count,
            filters = EXCLUDED.filters,
            updated_at = CURRENT_TIMESTAMP
        `, [
          session.user.id,
          query.trim(),
          JSON.stringify(filtros),
          results.total
        ]);
      } catch (error) {
        console.error('Failed to save search history:', error);
        // Don't fail the search if history save fails
      }
    }

    console.log('✅ Local database search successful:', {
      total: results.total,
      page: results.page,
      resultsCount: results.data.length
    });

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 API Search error:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}